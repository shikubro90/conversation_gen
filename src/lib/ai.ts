export type Provider = "openai" | "claude" | "openrouter" | "groq";

export interface ApiKeyConfig {
  provider: Provider;
  key: string;
  model?: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIRequestOptions {
  messages: AIMessage[];
  temperature?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  max_tokens?: number;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export async function validateApiKey(config: ApiKeyConfig): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: config.provider, key: config.key }),
    });
    return await res.json();
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

// ─── Generation ───────────────────────────────────────────────────────────────

export async function generateCompletion(
  config: ApiKeyConfig,
  options: AIRequestOptions
): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: config.provider,
      key: config.key,
      model: config.model,
      messages: options.messages,
      temperature: options.temperature,
      presence_penalty: options.presence_penalty,
      frequency_penalty: options.frequency_penalty,
      max_tokens: options.max_tokens,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Request failed ${res.status}`);
  return data.result;
}

// ─── Local Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = "convoai_api_keys";

export function saveApiKey(config: ApiKeyConfig): void {
  const existing = loadApiKeys();
  const updated = existing.filter((k) => k.provider !== config.provider);
  updated.push(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function loadApiKeys(): ApiKeyConfig[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getApiKey(provider: Provider): ApiKeyConfig | undefined {
  return loadApiKeys().find((k) => k.provider === provider);
}

export function removeApiKey(provider: Provider): void {
  const updated = loadApiKeys().filter((k) => k.provider !== provider);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getActiveKey(): ApiKeyConfig | undefined {
  const keys = loadApiKeys();
  const preferred = localStorage.getItem("convoai_active_provider") as Provider | null;
  if (preferred) {
    const found = keys.find((k) => k.provider === preferred);
    if (found) return found;
  }
  return keys[0];
}

export function setActiveProvider(provider: Provider): void {
  localStorage.setItem("convoai_active_provider", provider);
}
