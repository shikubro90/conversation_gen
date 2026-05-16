import type { AIMessage } from "./ai";

// ─── Randomization pools ──────────────────────────────────────────────────────

const BUYER_PERSONALITIES = [
  "a cautious first-timer who researches every purchase obsessively and asks lots of clarifying questions",
  "an experienced client who has worked with many freelancers, knows exactly what they want, and won't settle for vague answers",
  "a budget-conscious startup founder who's price-sensitive but recognizes quality when they see it",
  "an impatient entrepreneur who has a tight deadline and needs someone to take charge immediately",
  "a skeptical buyer who's been burned before and is testing the seller's reliability before committing",
  "a laid-back creative who communicates casually, cares more about vibe than specs",
  "a corporate procurement manager who speaks formally, needs deliverables well-documented, and has internal approval processes",
  "an indecisive client who keeps changing requirements but has a genuine budget and good intentions",
  "a very technical buyer who already knows exactly what stack they want and is evaluating the seller's expertise",
  "an enthusiastic solopreneur launching their dream project who gets excited but sometimes over-explains",
];

const SELLER_TONES = [
  "warm and consultative — builds rapport first, then moves to business",
  "direct and confident — brief responses, clear pricing, no fluff",
  "technical and detailed — loves explaining their process and methodology",
  "enthusiastic and energetic — matches buyer's excitement and uses vivid language",
  "calm and professional — measured, never oversells, lets the work speak",
  "empathetic and patient — mirrors buyer's concerns and validates before answering",
  "strategic — reframes the buyer's problem before solving it",
  "experienced mentor — gently educates the buyer while staying respectful",
];

const NEGOTIATION_STYLES = [
  "the seller holds firm on price but offers added value (extra revision, faster delivery)",
  "the seller offers a tiered breakdown so the buyer can choose their own scope",
  "the buyer pushes hard on price; the seller reduces scope instead of rate",
  "the buyer asks for a discount; the seller pivots to ROI instead of discounting",
  "both sides quickly align and the negotiation is smooth with minor back-and-forth",
  "the seller proposes milestones to reduce the buyer's risk and close faster",
  "the buyer mentions a competing quote; the seller differentiates on quality and reliability",
];

const OPENING_HOOKS = [
  "The buyer opens by referencing a specific project in the seller's portfolio.",
  "The buyer jumps straight to their problem without any pleasantries.",
  "The buyer asks a very specific technical question before even mentioning the project.",
  "The buyer opens warmly and shares their backstory before explaining the work.",
  "The buyer opens with budget upfront, then describes the project.",
  "The buyer asks about timeline first — they have a hard deadline.",
  "The buyer starts by mentioning they've already interviewed two other sellers.",
];

const CLOSING_MOVES = [
  "The buyer asks for a custom offer and the seller sends one immediately.",
  "The buyer says they need 24 hours to think — the seller follows up with a brief summary.",
  "The buyer asks for a sample or portfolio piece specific to the niche.",
  "Both agree on terms and the seller outlines the requirements they need to start.",
  "The buyer asks what happens if they're not happy — the seller explains their revision policy.",
];

const MESSAGE_LENGTH_PROFILES = [
  "short and punchy — most messages are 1-2 sentences, the conversation moves fast",
  "medium — 2-4 sentences per message, balanced back-and-forth",
  "varied — buyer writes short, seller writes detailed explanations",
  "varied — buyer writes detailed briefs, seller gives concise confirmations",
  "long-form — both sides write detailed messages, almost like emails",
];

const CONVERSATION_SIZES = [5, 6, 7, 8, 9, 10, 11, 12];

const PLATFORMS = ["Fiverr", "Upwork", "Toptal", "Freelancer.com", "PeoplePerHour", "99designs"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Seed generation (for truly unique output) ────────────────────────────────

function uniqueSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export interface ConvoFormData {
  profileName: string;
  projectType: string;
  topic: string;
  budget: string;
  timeline: string;
  tone: string;
  techStack: string;
  plan: string;
  notes: string;
}

export interface ConversationOutput {
  platform: string;
  service: string;
  topic: string;
  buyerPersonality: string;
  sellerTone: string;
  messages: Array<{ role: "buyer" | "seller"; text: string }>;
  customOffer: {
    title: string;
    price: string;
    delivery: string;
    revisions: string;
    includes: string[];
  };
  requirements: string[];
}

export function buildPrompt(form: ConvoFormData): { messages: AIMessage[]; meta: Record<string, string> } {
  const buyerPersonality = pick(BUYER_PERSONALITIES);
  const sellerTone = pick(SELLER_TONES);
  const negotiationStyle = pick(NEGOTIATION_STYLES);
  const openingHook = pick(OPENING_HOOKS);
  const closingMove = pick(CLOSING_MOVES);
  const messageLengthProfile = pick(MESSAGE_LENGTH_PROFILES);
  const conversationSize = pick(CONVERSATION_SIZES);
  const platform = pick(PLATFORMS);
  const seed = uniqueSeed();

  const meta = {
    buyerPersonality,
    sellerTone,
    platform,
    seed,
  };

  const systemPrompt = `You are an expert at generating hyper-realistic freelance platform conversations between buyers and sellers. Every conversation you generate must feel completely authentic, human, and unique — as if scraped from a real platform.

STRICT RULES:
- NEVER reuse full sentences or sentence structures from previous generations
- NEVER use generic phrases like "Great question!", "Absolutely!", "Certainly!", "Of course!", "No problem!"
- Each message must feel written by a real human with a distinct voice
- Vary punctuation, sentence length, and rhythm naturally
- Include real-world details: specific numbers, real-sounding names for tools/brands, concrete timelines
- The negotiation must feel genuine — not scripted
- Use contractions, occasional typos or informal phrasing where realistic
- Seed for uniqueness: ${seed}

OUTPUT FORMAT:
You must respond with ONLY valid JSON. No markdown, no explanation. Exactly this structure:
{
  "platform": "string",
  "service": "string",
  "topic": "string",
  "buyerPersonality": "string (1 sentence summary)",
  "sellerTone": "string (1 sentence summary)",
  "messages": [
    { "role": "buyer" | "seller", "text": "string" }
  ],
  "customOffer": {
    "title": "string",
    "price": "string",
    "delivery": "string",
    "revisions": "string",
    "includes": ["string", "string", ...]
  },
  "requirements": ["string", "string", ...]
}`;

  const userPrompt = `Generate a ${conversationSize}-message conversation on ${platform} for a ${form.projectType || "freelance"} project about "${form.topic || "a client project"}".

BUYER PROFILE: ${buyerPersonality}
SELLER TONE: ${sellerTone}
NEGOTIATION STYLE: ${negotiationStyle}
MESSAGE LENGTH: ${messageLengthProfile}
OPENING: ${openingHook}
CLOSING: ${closingMove}

Project details:
- Budget: ${form.budget || "not specified"}
- Timeline: ${form.timeline || "flexible"}
- Tech stack: ${form.techStack || "not specified"}
- Plan/package type: ${form.plan || "flexible"}
- Extra context: ${form.notes || "none"}

The customOffer should reflect a realistic agreed package based on the negotiation.
The requirements array should list 4-7 things the seller needs from the buyer to start (e.g. brand colors, login access, content, etc.).
Make this conversation feel completely different from any generic template. Be creative with the specific details, the way each person phrases things, and the flow of negotiation.`;

  return {
    messages: [
      { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
    ],
    meta,
  };
}

export function parseConversationOutput(raw: string): ConversationOutput {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  // Validate and normalise
  if (!parsed.messages || !Array.isArray(parsed.messages)) {
    throw new Error("Invalid output: missing messages array");
  }

  return parsed as ConversationOutput;
}
