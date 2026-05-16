import type { ConversationOutput } from "./prompt";

const STORAGE_KEY = "google_oauth";
const CLIENT_ID_KEY = "google_client_id";
const SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

// ─── Token storage ────────────────────────────────────────────────────────────

export interface GoogleToken {
  access_token: string;
  expires_at: number;
}

export function saveGoogleToken(token: GoogleToken) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

export function getGoogleToken(): GoogleToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const token: GoogleToken = JSON.parse(raw);
    if (Date.now() > token.expires_at - 60_000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function removeGoogleToken() {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveClientId(id: string) {
  localStorage.setItem(CLIENT_ID_KEY, id);
}

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CLIENT_ID_KEY) ?? "";
}

export function removeClientId() {
  localStorage.removeItem(CLIENT_ID_KEY);
}

export function isGoogleConnected(): boolean {
  return !!getGoogleToken();
}

// ─── OAuth implicit flow ──────────────────────────────────────────────────────
// Using implicit flow (response_type=token) so no client_secret or server needed.
// Token is returned directly in the URL hash after Google redirects back.

export function startGoogleAuth() {
  const clientId = getClientId();
  if (!clientId) throw new Error("Google Client ID not configured.");

  const redirectUri = `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: SCOPES,
    include_granted_scopes: "true",
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Called from /auth/callback — reads token out of the URL hash
export function extractTokenFromHash(): GoogleToken | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const access_token = hash.get("access_token");
  const expires_in = hash.get("expires_in");

  if (!access_token) return null;

  const token: GoogleToken = {
    access_token,
    expires_at: Date.now() + Number(expires_in ?? 3600) * 1000,
  };
  saveGoogleToken(token);
  return token;
}

// ─── Google Docs API ──────────────────────────────────────────────────────────

// Sends requests in batches to avoid payload size limits
async function batchUpdate(docId: string, headers: Record<string, string>, requests: object[]) {
  const CHUNK = 50;
  for (let i = 0; i < requests.length; i += CHUNK) {
    const chunk = requests.slice(i, i + CHUNK);
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ requests: chunk }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Failed to write content.");
  }
}

export async function createGoogleDoc(data: ConversationOutput): Promise<string> {
  const token = getGoogleToken();
  if (!token) throw new Error("Google not connected. Please reconnect in Settings.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.access_token}`,
    "Content-Type": "application/json",
  };

  // 1 — Create blank document
  const title = data.customOffer.title || `${data.service} - ${data.topic}`;
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers,
    body: JSON.stringify({ title }),
  });
  const doc = await createRes.json();
  if (!createRes.ok) {
    if (createRes.status === 401) throw new Error("Google session expired. Please reconnect in Settings.");
    throw new Error(doc.error?.message ?? "Failed to create Google Doc.");
  }
  const docId: string = doc.documentId;

  // 2 — Build all insert requests
  // Google Docs API inserts text sequentially — cursor tracks current end position
  const requests: object[] = [];
  let cursor = 1;

  const ins = (text: string) => {
    requests.push({ insertText: { location: { index: cursor }, text } });
    cursor += text.length;
  };

  const insStyled = (
    text: string,
    opts: { bold?: boolean; color?: { red: number; green: number; blue: number }; fontSize?: number }
  ) => {
    const start = cursor;
    ins(text);
    const fields: string[] = [];
    const textStyle: Record<string, unknown> = {};
    if (opts.bold) { textStyle.bold = true; fields.push("bold"); }
    if (opts.color) { textStyle.foregroundColor = { color: { rgbColor: opts.color } }; fields.push("foregroundColor"); }
    if (opts.fontSize) { textStyle.fontSize = { magnitude: opts.fontSize, unit: "PT" }; fields.push("fontSize"); }
    if (fields.length > 0) {
      requests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: cursor },
          textStyle,
          fields: fields.join(","),
        },
      });
    }
  };

  // Title
  insStyled(`${title}\n`, { bold: true, fontSize: 16 });
  ins("\n");

  // Conversation section
  insStyled("Conversation\n", { bold: true, fontSize: 13 });
  ins("\n");

  for (const m of data.messages) {
    const isBuyer = m.role === "buyer";
    insStyled(
      `${isBuyer ? "Buyer" : "Seller"}\n`,
      {
        bold: true,
        color: isBuyer
          ? { red: 0.8, green: 0, blue: 0 }
          : { red: 0.07, green: 0.53, blue: 0.07 },
      }
    );
    ins(`${m.text}\n`);
    ins("\n");
  }

  // Custom Offer section
  insStyled("Custom Offer\n", { bold: true, fontSize: 13 });
  ins("\n");
  insStyled(`${data.customOffer.title}\n`, { bold: true });
  ins(`Price: ${data.customOffer.price}   |   Delivery: ${data.customOffer.delivery}   |   Revisions: ${data.customOffer.revisions}\n`);
  ins("\n");
  insStyled("Includes:\n", { bold: true });
  for (const item of data.customOffer.includes) {
    ins(`- ${item}\n`);
  }
  ins("\n");

  // Requirements section
  insStyled("Requirements from Buyer\n", { bold: true, fontSize: 13 });
  ins("\n");
  data.requirements.forEach((r, i) => {
    ins(`${i + 1}. ${r}\n`);
  });

  // 3 — Apply in chunks of 50 to avoid payload size limit
  await batchUpdate(docId, headers, requests);

  return `https://docs.google.com/document/d/${docId}/edit`;
}
