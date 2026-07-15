// Heuristic AI-text detector (PLAN.md item 4).
//
// GPTZero/Turnitin require paid API keys we don't have yet, so this scores
// text with surface-level signals instead: stock AI phrases, repeated
// sentence openers, and low lexical variety within a sentence. It exposes
// the same `AiDetector` interface a real GPTZero-backed implementation
// would, so swapping it in later is a one-line change at the call site.

export type DetectionRisk = "red" | "amber" | "green";

export interface SentenceDetection {
  text: string;
  score: number; // 0-100, higher = more likely AI-generated
  risk: DetectionRisk;
}

export interface DetectionResult {
  overallScore: number; // 0-100
  risk: DetectionRisk;
  sentences: SentenceDetection[];
}

export interface AiDetector {
  detect(text: string): Promise<DetectionResult>;
}

// Common AI-writing tells: canned assistant phrases plus the same "AI slop"
// vocabulary the humanizer cleans up (delve, tapestry, furthermore, ...).
const STOCK_PHRASES = [
  "as an ai language model",
  "i don't have personal opinions",
  "i cannot provide",
  "as of my last knowledge update",
  "let's dive into",
  "unlock the full potential",
  "in today's fast-paced",
  "in today's digital landscape",
  "it is important to note that",
  "it's important to note that",
  "in conclusion",
  "moreover",
  "furthermore",
  "delve into",
  "delve",
  "tapestry",
  "crucial",
  "vibrant",
  "nestled",
  "underscore",
  "boasts",
  "testament to",
  "realm",
  "elevate",
  "leverage",
  "robust",
  "seamless",
  "unlock",
  "unleash",
  "game-changer",
  "cutting-edge",
  "landscape",
  "ever-evolving",
  "paradigm shift",
];

// Shared risk banding for every detector (heuristic and real providers alike),
// re-exported from _shared/detectors/types.ts so provider adapters map their
// normalized 0-100 scores the same way this heuristic does.
export function scoreToRisk(score: number): DetectionRisk {
  if (score >= 66) return "red";
  if (score >= 35) return "amber";
  return "green";
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stockPhraseScore(sentenceLower: string): number {
  const hits = STOCK_PHRASES.filter((phrase) => sentenceLower.includes(phrase)).length;
  return Math.min(hits / 2, 1);
}

function openerRepetitionScore(opener: string | undefined, openerCounts: Map<string, number>): number {
  if (!opener) return 0;
  const count = openerCounts.get(opener) ?? 0;
  if (count < 2) return 0;
  return Math.min((count - 1) / 3, 1);
}

function lexicalVarietyScore(sentence: string): number {
  const words = sentence.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 6) return 0;
  const variety = new Set(words).size / words.length;
  return Math.max(0, Math.min(1, (0.7 - variety) / 0.4));
}

// Stock phrases weigh heaviest: two or more hits in one sentence is on its
// own a strong enough signal to land in the "red" band.
const WEIGHTS = { stock: 0.7, opener: 0.15, variety: 0.15 } as const;

export function analyzeText(text: string): DetectionResult {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return { overallScore: 0, risk: "green", sentences: [] };
  }

  const openerCounts = new Map<string, number>();
  const openers = sentences.map((s) => s.split(/\s+/)[0]?.toLowerCase());
  for (const opener of openers) {
    if (!opener) continue;
    openerCounts.set(opener, (openerCounts.get(opener) ?? 0) + 1);
  }

  const scored: SentenceDetection[] = sentences.map((sentence, i) => {
    const lower = sentence.toLowerCase();
    const stock = stockPhraseScore(lower);
    const opener = openerRepetitionScore(openers[i], openerCounts);
    const variety = lexicalVarietyScore(sentence);
    const score = Math.round(
      (WEIGHTS.stock * stock + WEIGHTS.opener * opener + WEIGHTS.variety * variety) * 100,
    );
    return { text: sentence, score, risk: scoreToRisk(score) };
  });

  const overallScore = Math.round(
    scored.reduce((sum, s) => sum + s.score, 0) / scored.length,
  );

  return { overallScore, risk: scoreToRisk(overallScore), sentences: scored };
}

export const heuristicDetector: AiDetector = {
  detect(text: string): Promise<DetectionResult> {
    return Promise.resolve(analyzeText(text));
  },
};
