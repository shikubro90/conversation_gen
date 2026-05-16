import { generateCompletion, type ApiKeyConfig } from "./ai";
import type { ConvoFormData, ConversationOutput } from "./prompt";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentStep = "planning" | "writing" | "finalizing" | "done";

export interface AgentPlan {
  platform: string;
  service: string;
  topic: string;
  buyerPersonality: string;
  sellerPersonality: string;
  negotiationStyle: string;
  openingHook: string;
  closingMove: string;
  conversationStyle: string;
  emotionalArc: string;
  messageCount: number;
}

// ─── Pools ────────────────────────────────────────────────────────────────────

const BUYER_PERSONALITIES = [
  "shy and polite — gives short replies, avoids calls, trusts the seller gradually",
  "friendly and casual — addresses seller by name, gets straight to the point",
  "budget-conscious — names their budget early, negotiates directly",
  "confused beginner — tried doing it themselves, came with broken or incomplete work",
  "excited solopreneur — enthusiastic, over-explains their idea, eager to move fast",
  "business-focused — direct, wants price and timeline confirmed quickly",
  "technical buyer — knows the stack, shares code or files, asks precise questions",
  "returning client — already knows the seller, casual and trusting from the start",
  "hesitant buyer — interested but second-guesses, needs reassurance before committing",
];

const SELLER_PERSONALITIES = [
  "warm mentor — patient, explains things simply, builds trust before discussing price",
  "calm and direct — short messages, asks for files first, reviews before quoting",
  "technical expert — reviews code or specs carefully, gives honest assessment",
  "solution-oriented — listens, asks what help is needed, doesn't over-promise",
  "experienced freelancer — mentions workload honestly, negotiates professionally",
  "highly professional — structured, reliable, sends clear organized breakdowns",
];

const NEGOTIATION_STYLES = [
  "seller asks buyer their budget first, then counters with a higher number, they meet in the middle",
  "seller quotes a price, buyer pushes back, seller holds firm but offers added value",
  "seller simplifies scope first, then adjusts price to match reduced work",
  "buyer names a price, seller counters slightly higher, buyer accepts with minor pushback",
  "seller explains workload and ongoing projects to justify timeline and price",
  "smooth — both sides align quickly on price with minimal back-and-forth",
];

const OPENING_HOOKS = [
  "buyer addresses seller by name and asks if they are free to help",
  "buyer describes their business and asks if seller can build something for them",
  "buyer shares they tried doing it themselves and got stuck, needs rescue",
  "buyer has existing broken code or incomplete work and needs it fixed",
  "buyer has a hard deadline and leads with urgency before explaining the project",
  "buyer jumps straight to the problem without any pleasantries",
  "buyer has a specific feature that's not working and shares files or links",
];

const CLOSING_MOVES = [
  "buyer asks seller to send the offer, seller sends a brief warm offer, buyer accepts same day",
  "seller asks if they can send a custom offer, buyer says yes, deal is closed with an emoji",
  "buyer confirms budget and timeline, seller says deal and prepares offer immediately",
  "seller outlines requirements, buyer says they'll prepare everything and get started",
  "buyer needs a day to think — seller sends a brief reassuring message, buyer comes back",
];

const CONVERSATION_STYLES = [
  "short and direct — most messages are 1–3 sentences, fast-paced, minimal fluff",
  "warm and detailed — seller asks questions gradually, buyer opens up over time",
  "technical — seller asks for code or files, reviews them, gives honest assessment",
  "mixed — buyer writes brief replies, seller writes medium structured explanations",
  "casual — both sides use informal language, occasional typos, feels like a real chat",
];

const PLATFORMS = ["Fiverr", "Upwork", "Freelancer.com", "PeoplePerHour"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function callWithRetry(
  config: ApiKeyConfig,
  prompt: string,
  maxTokens: number,
  retries = 2
): Promise<string> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await generateCompletion(config, {
        messages: [{ role: "user", content: prompt }],
        temperature: 1.2,
        presence_penalty: 1.0,
        frequency_penalty: 0.9,
        max_tokens: maxTokens,
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError!;
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ─── Step 1: Plan ─────────────────────────────────────────────────────────────

async function stepPlan(config: ApiKeyConfig, form: ConvoFormData): Promise<AgentPlan> {
  const platform = pick(PLATFORMS);
  const buyerPersonality = pick(BUYER_PERSONALITIES);
  const sellerPersonality = pick(SELLER_PERSONALITIES);
  const negotiationStyle = pick(NEGOTIATION_STYLES);
  const openingHook = pick(OPENING_HOOKS);
  const closingMove = pick(CLOSING_MOVES);
  const conversationStyle = pick(CONVERSATION_STYLES);
  const messageCount = Math.floor(Math.random() * 11) + 35; // 35–45
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const prompt = `You are a conversation design planner for a freelance platform simulation tool.

Given the project details below, finalize the conversation plan. Your only job is to write a specific service name, topic, and a one-sentence emotional arc for this particular project.

PROJECT DETAILS:
- Type: ${form.projectType || "freelance project"}
- Topic/Niche: ${form.topic || "general"}
- Budget: ${form.budget || "not specified"}
- Timeline: ${form.timeline || "flexible"}
- Tech stack: ${form.techStack || "not specified"}
- Extra notes: ${form.notes || "none"}

PRE-SELECTED PARAMETERS (copy exactly into your JSON):
- Platform: ${platform}
- Buyer personality: ${buyerPersonality}
- Seller personality: ${sellerPersonality}
- Negotiation style: ${negotiationStyle}
- Opening hook: ${openingHook}
- Closing move: ${closingMove}
- Conversation style: ${conversationStyle}
- Message count: ${messageCount}

Write emotionalArc as one sentence describing the buyer's emotional journey in this specific conversation.

Uniqueness seed: ${seed} — use this to make choices that feel fresh and different from any previous generation.

Respond with ONLY valid JSON, no markdown:
{
  "platform": "${platform}",
  "service": "string",
  "topic": "string",
  "buyerPersonality": "${buyerPersonality}",
  "sellerPersonality": "${sellerPersonality}",
  "negotiationStyle": "${negotiationStyle}",
  "openingHook": "${openingHook}",
  "closingMove": "${closingMove}",
  "conversationStyle": "${conversationStyle}",
  "emotionalArc": "string",
  "messageCount": ${messageCount}
}`;

  const raw = await callWithRetry(config, prompt, 600);
  return parseJSON<AgentPlan>(raw);
}

// ─── Step 2: Write conversation ───────────────────────────────────────────────

async function stepWrite(
  config: ApiKeyConfig,
  form: ConvoFormData,
  plan: AgentPlan
): Promise<Array<{ role: "buyer" | "seller"; text: string }>> {
  const prompt = `You are a highly advanced Fiverr conversation generation agent.

Your task is to write a REALISTIC freelance buyer-seller conversation that feels emotionally authentic, commercially realistic, and indistinguishable from a real Fiverr or Upwork chat.

==================================================
CONVERSATION PLAN
==================================================
Platform: ${plan.platform}
Service: ${plan.service}
Topic/Niche: ${plan.topic}
Seller profile name: ${form.profileName || "not specified"}
Budget: ${form.budget || "not specified"}
Timeline: ${form.timeline || "flexible"}
Tech stack: ${form.techStack || "not specified"}
Extra context: ${form.notes || "none"}

Buyer personality: ${plan.buyerPersonality}
Seller personality: ${plan.sellerPersonality}
Negotiation style: ${plan.negotiationStyle}
Opening: ${plan.openingHook}
Closing: ${plan.closingMove}
Conversation style: ${plan.conversationStyle}
Emotional arc: ${plan.emotionalArc}
Total messages: ${plan.messageCount} — alternate buyer/seller, start with buyer
(Seller may send two consecutive messages occasionally — realistic on Fiverr)

==================================================
STUDY EXAMPLE 1 — Warm, detailed, cozy project
==================================================
Buyer: Hello, I own a coffee shop. Business is doing well offline, but I see many cafés now have websites. I also want my shop to be online. Can you build my coffee shop website?

Seller: Hello, I'm really glad that you reached out to me. Yes, I can definitely build a professional WordPress website for your coffee shop. That's actually a great step because nowadays people usually search online before visiting any café. Before we go further, what's your coffee shop name?

Buyer: It's Brew Haven.

Seller: Brew Haven is a really nice name. So tell me a little — how do people feel when they come to your café?

Buyer: It's very cozy and friendly. Most of our customers are regulars.

Seller: That's actually perfect. So your website shouldn't just be a business page — it should reflect that same cozy café feeling so people trust your place instantly online.

Buyer: Yes, I want that.

Seller: So your main goal is: show your café vibe, attract local customers, make people feel comfortable before visiting. Do you already have a logo and brand colors, or is it still very basic?

Buyer: I have a logo but it's very simple.

Seller: No problem. I can still make everything look very premium with proper design and layout. Normally I suggest a short call just to understand everything quickly, but only if you're comfortable.

Buyer: I feel shy on calls, I prefer chat only.

Seller: No worries at all. We'll do everything here step by step. I'll guide you like a simple plan so you always know what's happening.

Seller: Let me explain what I'll build: WordPress website setup, cozy café-style design, menu section, about section, gallery, Google Maps location, contact section, mobile responsive design, SSL security setup.

Buyer: Hmm… honestly the price feels a bit high for me.

Seller: I completely understand. Let me see what I can do because I genuinely like your project. Instead of a larger multi-section structure, I can simplify it into a focused single-page premium website. That way you still get a beautiful professional online presence without stretching the budget.

Buyer: Yes, that sounds much better for me.

Seller: Perfect. For coffee shops, a clean single-page website works really well. So here's what I can do — I'll complete the full project for $100 USD and still keep the design quality premium. Should we move forward?

Buyer: Yes, that's perfect. Let's proceed.

Seller: Amazing. I really appreciate your trust. I'll prepare and send the custom offer now.

==================================================
STUDY EXAMPLE 2 — Short, direct, technical fix project
==================================================
Buyer: Hello Amaresh, how are you doing? I need a quick help with a static app I'm about to develop. Are you free?

Seller: Hi, Thanks for reaching out. I can help you with your static app development. What kind of app are you looking for? Do you have any designs or sketches? I'm free to join a call if you want.

Buyer: Actually, I was trying to do it by myself but I'm not that proficient in Flutter. I tried vibe coding, and it didn't work. So I have a code base and it's not complete. The screens are designed in Flutter but the functionality is not working.

Seller: Hmm.. got it. Vibe coding is not something you can easily do. It needs some technical knowledge. Also it is not scalable for future. No worries. I've got you off guard. Please share the code and let me know what help you need.

Buyer: Okay I'm sharing the code with you. After reviewing, tell me the price and timeline. All you need to do is create a custom calculation page and I already have the data through the ZIP file. You just make sure the calculation is working. It's mainly a home loan calculator.

Seller: Got it. Please share the code so I can understand.

Buyer: https://drive.google.com/file/d/example — Check this link

Seller: Thanks. Let me check it. Give me some time.

Seller: Hi, I have checked it and I can fix the code. Since I do full projects and I have some ongoing projects right now. If you give me a week than it will be better for me. But I will try to solve this ASAP. How much do you want to pay for this job?

Buyer: Thanks for confirming. Finally found someone who can help. A week is okay. I was planning $100. Is this fine?

Seller: Honestly. For the amount of job. I would charge $150 USD. Can you increase the budget?

Buyer: Hmm… I got it. But I can't do $150. Let's do $120.

Seller: Okay sounds good to me. Can I send you a custom offer?

Buyer: Perfect. Sure. Send me the offer and I'll accept it today.

Seller: Deal 🤝

==================================================
KEY PATTERNS TO FOLLOW
==================================================

SELLER rules:
- Ask ONE question at a time — never a list of questions in one message
- Use buyer's name or business name once it is mentioned
- If a seller profile name is provided, the buyer may address the seller by that name naturally in early messages
- Short acknowledgment first, then expand if needed ("Hmm.. got it.", "That's actually perfect. So...")
- Build trust before discussing price — never lead with price
- Adapt immediately to buyer's preferences (no calls, existing codebase, tight budget)
- If reviewing files or code — mention it takes time, come back with assessment
- Mention your workload or ongoing projects when relevant — sounds human
- In negotiation: ask buyer's budget OR counter with value reasoning — never just drop price
- Sound warm, experienced, direct — never salesy or desperate
- NO emojis. NO icons. Plain text only.

SELLER CTA RULE — CRITICAL:
- Every single seller message MUST end with either a question pushing the conversation forward OR a soft call to action
- The CTA or question must feel natural — not forced or robotic
- Examples of natural CTAs:
  "What do you think?" / "Does that work for you?" / "Should I send the offer?" /
  "Can you share the files?" / "Want me to put together a plan?" /
  "Does that timeline work on your end?" / "Shall we get started?" /
  "Would that fit your budget?" / "Let me know and I'll get started right away."
- NEVER end a seller message with a statement that requires no response
- Every seller message must keep the buyer engaged and moving forward

SELLER REQUIREMENTS SUMMARY RULE — CRITICAL:
- Once the seller has gathered enough information from the buyer, the seller must summarize the project requirements back to the buyer
- ALWAYS use this exact format: an intro sentence, then a - dash list, then a short closing sentence or CTA after the list
- The intro sentence and closing sentence must vary in tone and wording every time — never the same phrasing twice
- ALWAYS use - (dash) for list items. Never use bullets (•), numbers, or any other symbol
- Format structure (vary the words, keep the structure):

  [intro sentence]

  - [item]
  - [item]
  - [item]
  - [item]
  - [item]

  [closing sentence or CTA]

- Intro sentence examples (vary every time):
  "Here's what I have so far —"
  "Let me just confirm what we are working with —"
  "Quick summary before I put the offer together —"
  "So here is what the project looks like —"
  "Just to make sure we are on the same page —"
  "Alright, based on what you told me —"
- Closing sentence examples (vary every time):
  "Does that cover everything?"
  "Let me know if I missed anything."
  "Is that the full picture or should I add something?"
  "Once you confirm, I will prepare the offer right away."
  "Anything you want to adjust before I send the offer?"

BUYER rules:
- Match the personality in the plan exactly
- Use seller's name if the opening hook calls for it
- Give short replies where personality calls for it
- React naturally to seller messages ("Hmm..", "Oh that's fast.", "Got it.", "Let's proceed.")
- Name a budget when asked — make it slightly lower than realistic
- Gradually become more comfortable and ready to close
- NO emojis. NO icons. Plain text only.

ABSOLUTE REALISM rules — this is the most important section:
- Every single message must feel like a real human typed it in real time
- NO unnecessary words. NO padding. NO filler.
- If a message can be said in 3 words, say it in 3 words
- If something needs detail, write it in full — do not cut it short unnaturally
- NEVER write anything that sounds like AI generated it
- NEVER use corporate or formal language in casual moments
- NEVER start a message with: "Great!", "Absolutely!", "Certainly!", "Of course!", "Sure thing!"
- Use these SPARINGLY — maximum once each across the entire conversation:
  "Hmm..", "Got it.", "Honestly.", "To be honest with you...",
  "No worries at all.", "I completely understand.", "That actually makes sense."
- Vary sentence length dramatically — some messages are 4 words, some are 6 lines
- Occasional natural imperfection in grammar is realistic — do not over-correct
- The conversation should feel like reading a real saved chat — nothing more, nothing less

MESSAGE LENGTH rules:
- Some buyer messages: just 1 sentence or even a few words
- Some buyer messages: 3–5 sentences when explaining or reacting
- Some seller messages: very short acknowledgment or question
- Some seller messages: detailed explanation across multiple sentences
- Seller may occasionally send two back-to-back messages (short reply then detailed breakdown)
- Mix this randomly throughout — do NOT follow a pattern

EMOTIONAL FLOW:
Curiosity → Clarification → Comfort → Confidence → Negotiation → Agreement → Excitement

==================================================
FIVERR DUPLICATE FLAG AWARENESS — CRITICAL
==================================================
Fiverr's algorithm flags seller accounts when identical or near-identical conversations appear on the same profile.
This means:

- NEVER reuse the same opening sentence structure across generations
- NEVER use the same negotiation sequence (e.g. always $100 → $150 → $120)
- NEVER use the same requirement summary format twice
- NEVER use the same CTA phrases in the same order
- NEVER use the same project explanation structure
- Every conversation must feel written by a different human on a different day
- Sentence rhythm, vocabulary choices, explanation depth — all must vary
- Even for the exact same project type, the conversation flow must be structurally different each time

Unique generation seed for this conversation: ${Date.now()}-${Math.random().toString(36).slice(2, 8)}

Use this seed mentally — let it push you toward choices you would not normally make first.

==================================================
OUTPUT FORMAT
==================================================
Respond with ONLY valid JSON, no markdown:
{
  "messages": [
    { "role": "buyer" | "seller", "text": "string" }
  ]
}

Write exactly ${plan.messageCount} messages. Alternate buyer/seller. Start with buyer.
Seller may send two consecutive messages occasionally — this is natural on Fiverr.
NO emojis or icons anywhere in any message.`;

  const raw = await callWithRetry(config, prompt, 7000);
  const parsed = parseJSON<{ messages: Array<{ role: "buyer" | "seller"; text: string }> }>(raw);
  return parsed.messages;
}

// ─── Step 3: Finalize offer + requirements ────────────────────────────────────

async function stepFinalize(
  config: ApiKeyConfig,
  plan: AgentPlan,
  messages: Array<{ role: "buyer" | "seller"; text: string }>
): Promise<{ customOffer: ConversationOutput["customOffer"]; requirements: string[] }> {
  const convoText = messages
    .map((m) => `${m.role === "buyer" ? "Buyer" : "Seller"}: ${m.text}`)
    .join("\n");

  const prompt = `You are a freelance deal analyst. Read the conversation and write the custom offer and requirements list.

CONVERSATION:
${convoText}

SERVICE: ${plan.service}
PLATFORM: ${plan.platform}

STUDY THESE TWO OFFER STYLES — pick the style that fits the conversation:

STYLE 1 — Warm and detailed (for new builds, creative projects):
"Thank you so much for sharing your vision for Brew Haven.
I'd be happy to create a professional and cozy WordPress website that reflects your café atmosphere.
The website will include:
• Hero section
• About section
• Menu display
• Gallery
• Location & Google Maps
• Contact section
What I will provide:
• Custom WordPress development
• Mobile responsive design
• SSL security setup
• Basic SEO setup
Timeline: 10 Days
Investment: $100 USD
Also included: 30 days free support
My goal is to create a website that feels warm and truly represents the Brew Haven experience.
Kind regards,"

STYLE 2 — Short and direct (for fixes, technical work, quick jobs):
"Hi there,
I will fix your existing codebase and make sure the loan calculation is working perfectly.
For the job, I'll charge $120 with a 7 days timeline.
Please accept the offer to get started.
Best regards, [Seller name]"

RULES:
- Choose the style that matches the conversation tone
- Price, delivery, revisions must match exactly what was negotiated
- Do NOT invent features not discussed
- Requirements must be based strictly on what the seller would need to start
- 3–6 requirements, concise and specific

Respond with ONLY valid JSON, no markdown:
{
  "customOffer": {
    "title": "string",
    "price": "string",
    "delivery": "string",
    "revisions": "string",
    "includes": ["string", "string", "string"]
  },
  "requirements": ["string", "string", "string"]
}`;

  const raw = await callWithRetry(config, prompt, 900);
  return parseJSON<{ customOffer: ConversationOutput["customOffer"]; requirements: string[] }>(raw);
}

// ─── Main agent ───────────────────────────────────────────────────────────────

export async function runConversationAgent(
  config: ApiKeyConfig,
  form: ConvoFormData,
  onStep: (step: AgentStep) => void
): Promise<ConversationOutput> {
  onStep("planning");
  const plan = await stepPlan(config, form);

  onStep("writing");
  const messages = await stepWrite(config, form, plan);

  onStep("finalizing");
  const { customOffer, requirements } = await stepFinalize(config, plan, messages);

  onStep("done");

  return {
    platform: plan.platform,
    service: plan.service,
    topic: plan.topic,
    buyerPersonality: plan.buyerPersonality,
    sellerTone: plan.sellerPersonality,
    messages,
    customOffer,
    requirements,
  };
}
