// Layer 2 (PLAN.md item 3): regex-based post-processing that swaps out common
// "AI slop" words/phrases LLMs overuse (delve, tapestry, furthermore, ...) for
// more natural, everyday alternatives. Runs on the raw LLM output from
// /humanize before it's sent back to the client.

// Each marker maps to a few natural synonyms; one is picked at random per
// occurrence so repeated markers in the same text don't all collapse to the
// same replacement (which would just create a new detectable pattern).
const SYNONYMS: Record<string, string[]> = {
  "delve into": ["look into", "dig into", "explore"],
  "delve": ["dig", "look closely", "explore"],
  "tapestry": ["mix", "blend", "mosaic"],
  "crucial": ["key", "important", "essential"],
  "vibrant": ["lively", "colorful", "energetic"],
  "nestled": ["tucked", "set", "located"],
  "underscore": ["highlight", "emphasize", "point up"],
  "underscores": ["highlights", "emphasizes", "points up"],
  "furthermore": ["also", "on top of that", "plus"],
  "moreover": ["also", "besides", "what's more"],
  "in conclusion": ["to sum up", "all in all", "in short"],
  "boasts": ["has", "offers", "comes with"],
  "testament to": ["proof of", "a sign of", "evidence of"],
  "realm": ["field", "world", "space"],
  "elevate": ["raise", "improve", "boost"],
  "leverage": ["use", "make use of", "tap into"],
  "robust": ["strong", "solid", "reliable"],
  "seamless": ["smooth", "effortless", "hassle-free"],
  "unlock": ["open up", "reveal", "enable"],
  "unleash": ["release", "set off", "bring out"],
  "game-changer": ["big deal", "turning point", "major shift"],
  "cutting-edge": ["state-of-the-art", "leading-edge", "advanced"],
  "in today's world": ["these days", "nowadays", "right now"],
  "it is important to note that": ["worth noting:", "note that", "keep in mind:"],
  "landscape": ["scene", "environment", "space"],
  "ever-evolving": ["constantly changing", "always shifting", "fast-moving"],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function matchCase(replacement: string, original: string): string {
  // Multi-word markers (e.g. "delve into") are matched as a single span, so an
  // all-caps leading word ("DELVE into") wouldn't make the *whole* span uppercase.
  // Judge case by the first word only, so it still counts as shouting.
  const firstWord = original.split(/\s+/)[0] ?? original;
  if (firstWord === firstWord.toUpperCase() && firstWord !== firstWord.toLowerCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longer phrases first so e.g. "delve into" is matched before the bare "delve".
const MARKERS = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);

export function cleanAiSlop(text: string): string {
  let result = text;
  for (const marker of MARKERS) {
    const pattern = new RegExp(`\\b${escapeRegExp(marker)}\\b`, "gi");
    result = result.replace(pattern, (match) => matchCase(pickRandom(SYNONYMS[marker]), match));
  }
  return result;
}
