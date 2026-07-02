// Mirrors src/data/content.ts (MODES ids, TONES, STYLES) so the backend accepts
// exactly the values the Editor screen can send.
export const MODES = ["light", "medium", "aggressive", "ninja"] as const;
export type HumanizeMode = (typeof MODES)[number];

export const TONES = [
  "Conversational", "Persuasive", "Professional", "Friendly", "Confident",
  "Witty", "Empathetic", "Bold", "Informative", "Storytelling",
  "Authoritative", "Inspirational", "Casual",
] as const;

export const STYLES = ["Marketing", "Academic", "Journalistic", "Creative", "Technical"] as const;

const BASE_SYSTEM_PROMPT =
  "You rewrite text so it reads naturally, as if written by a human, not an AI. " +
  "Preserve the original meaning, facts, and approximate length. ";

// Each mode tunes how much perplexity (word-choice unpredictability) and
// burstiness (sentence-length variation) to inject, since AI detectors key on
// both being unnaturally low in raw LLM output.
const MODE_INSTRUCTIONS: Record<HumanizeMode, string> = {
  light:
    "Make light touch-ups only: swap a few of the most predictable/robotic words for more natural synonyms " +
    "and smooth out any stiff phrasing. Keep sentence structure, order, and length close to the original.",
  medium:
    "Rewrite at a balanced intensity: vary sentence length (mix short and medium sentences instead of uniform " +
    "length), replace generic AI-sounding phrases and transitions (e.g. 'furthermore', 'in conclusion', " +
    "'it is important to note') with more natural alternatives, and reorder a few clauses so the rhythm feels " +
    "less templated.",
  aggressive:
    "Deeply restructure the text to break statistical patterns a detector would key on: mix short punchy " +
    "sentences with longer, more complex ones (high burstiness), vary word choice noticeably between " +
    "similar ideas instead of repeating the same phrasing (high perplexity), use contractions and idiomatic " +
    "connectors where natural, and avoid repeating the same sentence template twice in a row.",
  ninja:
    "Maximize entropy for the strictest detectors: aggressively vary sentence length including fragments and " +
    "occasional run-ons, use unpredictable but natural word choices instead of the most statistically likely " +
    "synonym, vary paragraph and sentence rhythm throughout, and let a touch of the writer's personality show " +
    "(asides, rhetorical questions, mild imperfections) as long as meaning and facts stay accurate.",
};

function normalizeMode(mode: unknown): HumanizeMode | null {
  if (typeof mode !== "string") return null;
  const lower = mode.toLowerCase();
  return (MODES as readonly string[]).includes(lower) ? (lower as HumanizeMode) : null;
}

export function isValidTone(tone: unknown): tone is (typeof TONES)[number] {
  return typeof tone === "string" && (TONES as readonly string[]).includes(tone);
}

export function isValidStyle(style: unknown): style is (typeof STYLES)[number] {
  return typeof style === "string" && (STYLES as readonly string[]).includes(style);
}

export function isValidMode(mode: unknown): boolean {
  return normalizeMode(mode) !== null;
}

export function buildHumanizeSystemPrompt(opts: { mode?: unknown; tone?: unknown; style?: unknown }): string {
  const mode = normalizeMode(opts.mode) ?? "medium";
  const parts = [BASE_SYSTEM_PROMPT + MODE_INSTRUCTIONS[mode]];

  if (isValidTone(opts.tone)) {
    parts.push(`Write in a ${opts.tone.toLowerCase()} tone.`);
  }
  if (isValidStyle(opts.style)) {
    parts.push(`Match a ${opts.style.toLowerCase()} writing style.`);
  }

  parts.push("Reply with only the rewritten text, no preamble, labels, or explanation.");
  return parts.join(" ");
}
