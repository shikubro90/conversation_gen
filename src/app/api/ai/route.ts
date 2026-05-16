import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { provider, key, model, messages, temperature, presence_penalty, frequency_penalty, max_tokens } =
    await req.json();

  try {
    let raw: string;

    if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model ?? "claude-haiku-4-5-20251001",
          max_tokens: max_tokens ?? 2000,
          temperature: Math.min(temperature ?? 1.0, 1.0),
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `Claude error ${res.status}`);
      raw = data.content[0].text;

    } else if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model ?? "gpt-4o", messages, temperature, presence_penalty, frequency_penalty, max_tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `OpenAI error ${res.status}`);
      raw = data.choices[0].message.content;

    } else if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://convoai.app",
          "X-Title": "ConvoAI Generator",
        },
        body: JSON.stringify({ model: model ?? "openai/gpt-4o", messages, temperature, presence_penalty, frequency_penalty, max_tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `OpenRouter error ${res.status}`);
      raw = data.choices[0].message.content;

    } else if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model ?? "llama-3.3-70b-versatile", messages, temperature: Math.min(temperature ?? 1.2, 2.0), max_tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `Groq error ${res.status}`);
      raw = data.choices[0].message.content;

    } else {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    return NextResponse.json({ result: raw });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
