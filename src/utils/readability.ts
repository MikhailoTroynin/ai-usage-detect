// Readability engine (PLAN.md item 5).
//
// Pure TS implementation of the Flesch Reading Ease and Flesch-Kincaid
// Grade Level formulas — no external API, no dependencies. Framework
// agnostic so it can be imported directly by the Metrics screen (Expo/RN)
// and re-exported for the Supabase Edge Functions backend from the same
// source of truth.

export interface ReadabilityResult {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
}

const EMPTY_RESULT: ReadabilityResult = {
  fleschReadingEase: 0,
  fleschKincaidGrade: 0,
  wordCount: 0,
  sentenceCount: 0,
  syllableCount: 0,
  avgWordsPerSentence: 0,
  avgSyllablesPerWord: 0,
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function extractWords(text: string): string[] {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) ?? [];
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Standard heuristic vowel-group syllable counter: strips a trailing
// silent e/ed/es, then counts vowel-sound groups. Not linguistically
// perfect, but accurate enough for a readability estimate.
export function countSyllables(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.length === 0) return 0;
  if (lower.length <= 3) return 1;

  // The "l" is deliberately excluded from the consonant class here so
  // words ending in "-le" after a consonant (apple, table, little) keep
  // their final syllable instead of having it stripped as a silent e.
  const stripped = lower.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function analyzeReadability(text: string): ReadabilityResult {
  const words = extractWords(text);
  const wordCount = words.length;
  if (wordCount === 0) return EMPTY_RESULT;

  const sentenceCount = Math.max(1, splitSentences(text).length);
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const fleschReadingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschKincaidGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  return {
    fleschReadingEase: round(fleschReadingEase, 1),
    fleschKincaidGrade: round(fleschKincaidGrade, 1),
    wordCount,
    sentenceCount,
    syllableCount,
    avgWordsPerSentence: round(avgWordsPerSentence, 1),
    avgSyllablesPerWord: round(avgSyllablesPerWord, 2),
  };
}
