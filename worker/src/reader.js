// The Reader: Dusk's guide, written with Claude.
import Anthropic from "@anthropic-ai/sdk";

const READER_SYSTEM = `You are the Reader inside Dusk, a reflective companion for people crossing a life transition (a job ending, a move, a loss, a new chapter). Each evening at sunset the person picks a tarot card, reads one question, and writes a few lines. You respond to what they wrote.

How you speak:
- Warm, unhurried and plain. Short sentences. Talk like a wise friend, not a therapist and not a mystic.
- Reflect, never predict. Never say what will happen, never give dates, outcomes or "you will". Tarot here is a mirror for reflection, not fortune-telling.
- Notice one specific thing in their words or their cards and name it. Connect to earlier evenings when the history shows a real pattern (a card repeating, a word they keep using, a person they keep mentioning). Don't invent patterns.
- At most one question, and only if it helps. Never lecture, never give a list of advice, never use the words "manifest", "universe" or "energy".
- Hard cards (Death, The Tower, Ten of Swords) always come with what they clear space for. Death means transformation, never literal death.
- Use the card's meaning as given. Don't add other tarot lore.
- If they wrote very little or nothing, be gentle and brief; don't push.

Safety: set needs_support to true if the writing suggests the person may harm themselves, is thinking about suicide, is in danger, or is in acute crisis. In that case keep your words simple and kind, say plainly that they deserve support right now and that talking to someone can help. Otherwise needs_support is false.`;

const lineSchema = {
  type: "object",
  properties: {
    line: { type: "string", description: "One to three short sentences, under 60 words." },
    needs_support: { type: "boolean" },
  },
  required: ["line", "needs_support"],
  additionalProperties: false,
};

const weeklySchema = {
  type: "object",
  properties: {
    reflections: { type: "array", items: { type: "string" }, description: "Two or three observations, one or two sentences each." },
    question: { type: "string", description: "One question to carry into the next week." },
  },
  required: ["reflections", "question"],
  additionalProperties: false,
};

const closingSchema = {
  type: "object",
  properties: {
    closing: { type: "string", description: "A closing reflection on the whole crossing, 60 to 110 words." },
  },
  required: ["closing"],
  additionalProperties: false,
};

function historyText(evenings, cardsById) {
  if (!evenings.length) return "No earlier evenings.";
  return evenings
    .map((e) => {
      const c = cardsById[e.picked];
      return `Evening ${e.n} (${e.movement}): picked ${c ? c.name : e.picked}. The evening felt: ${e.weather || "not said"}. Question: ${e.question || "-"}. They wrote: ${e.entry ? e.entry.slice(0, 600) : "(nothing)"}`;
    })
    .join("\n");
}

async function ask(env, prompt, schema, maxTokens) {
  if (!env.ANTHROPIC_API_KEY) return null; // local development without a key
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: READER_SYSTEM,
      output_config: { effort: "low", format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    // Record what went wrong so it can be diagnosed, then let the caller use its gentle fallback.
    const detail = `${e.status || ""} ${e.name || ""} ${e.message || e}`.slice(0, 1000);
    console.error("Reader call failed:", detail);
    await env.DB.prepare("INSERT INTO reader_errors (detail) VALUES (?1)").bind(detail).run().catch(() => {});
    return null;
  }
  if (response.stop_reason === "refusal") return null;
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function eveningLine(env, { crossing, evening, card, earlier, cardsById }) {
  const prompt = `The person's junction, in their words: "${crossing.junction_words || crossing.junction_type || "not given"}".
What they hope this crossing gives them: "${crossing.intention || "not given"}".
Crossing length: ${crossing.length} evenings. Tonight is evening ${evening.n}, in the movement "${evening.movement}". Tonight felt: ${evening.weather || "not said"}.

Earlier evenings:
${historyText(earlier, cardsById)}

Tonight they picked ${card.name}. Its meaning in Dusk: ${card.meaning}
The question they sat with: ${evening.question}
What they wrote: ${evening.entry ? evening.entry : "(nothing)"}

Write the Reader's line for tonight.`;
  const out = await ask(env, prompt, lineSchema, 2000);
  return out || { line: "Thank you for sitting with this tonight. Dusk comes again tomorrow.", needs_support: false };
}

export async function weeklyReading(env, { crossing, evenings, cardsById, week }) {
  const prompt = `The person's junction, in their words: "${crossing.junction_words || crossing.junction_type || "not given"}". What they hope this crossing gives them: "${crossing.intention || "not given"}". Crossing length: ${crossing.length} evenings. This is the reading at the end of week ${week}.

All evenings so far:
${historyText(evenings, cardsById)}

Write the weekly reading: two or three specific observations about patterns in their cards and words, and one question for the week ahead.`;
  return (await ask(env, prompt, weeklySchema, 3000)) || { reflections: ["You kept showing up this week. That counts."], question: "What do you want to notice in the week ahead?" };
}

export async function closingReflection(env, { crossing, evenings, cardsById }) {
  const prompt = `The person's junction, in their words: "${crossing.junction_words || crossing.junction_type || "not given"}". They have finished a ${crossing.length}-evening crossing. What they hoped it would give them: "${crossing.intention || "not given"}".

Every evening:
${historyText(evenings, cardsById)}

Write the closing reflection for their Crossing Scroll: what changed between the first evening and the last, in their own words where possible. End by naming the step The Fool invites them to take, without predicting anything.`;
  return (await ask(env, prompt, closingSchema, 3000)) || { closing: "You crossed. The cards are in order, and the words are yours." };
}
