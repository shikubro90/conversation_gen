import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { provider, key } = await req.json();

  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return NextResponse.json({ valid: true });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ valid: false, error: data?.error?.message ?? `HTTP ${res.status}` });

    } else if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      });
      if (res.ok || res.status === 400) return NextResponse.json({ valid: true });
      if (res.status === 401) return NextResponse.json({ valid: false, error: "Invalid API key" });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ valid: false, error: data?.error?.message ?? `HTTP ${res.status}` });

    } else if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return NextResponse.json({ valid: true });
      if (res.status === 401) return NextResponse.json({ valid: false, error: "Invalid API key" });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ valid: false, error: data?.error?.message ?? `HTTP ${res.status}` });

    } else if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return NextResponse.json({ valid: true });
      if (res.status === 401) return NextResponse.json({ valid: false, error: "Invalid API key" });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ valid: false, error: data?.error?.message ?? `HTTP ${res.status}` });
    }

    return NextResponse.json({ valid: false, error: "Unknown provider" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ valid: false, error: e instanceof Error ? e.message : "Network error" }, { status: 500 });
  }
}
