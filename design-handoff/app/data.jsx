// data.jsx — fake data, constants, and the Icon set for the AI Humanizer app

// ── Processing intensity modes ───────────────────────────────
const MODES = [
  { id: 'light',      label: 'Light',      blurb: 'Gentle touch-ups. Keeps your voice almost intact.' },
  { id: 'medium',     label: 'Medium',     blurb: 'Balanced rewrite. Best for most content.' },
  { id: 'aggressive', label: 'Aggressive', blurb: 'Deep restructuring to break statistical patterns.' },
  { id: 'ninja',      label: 'Ninja',      blurb: 'Maximum entropy. For the strictest detectors.' },
];

// ── 13 tone presets ──────────────────────────────────────────
const TONES = [
  'Conversational', 'Persuasive', 'Professional', 'Friendly', 'Confident',
  'Witty', 'Empathetic', 'Bold', 'Informative', 'Storytelling',
  'Authoritative', 'Inspirational', 'Casual',
];

// ── 5 style profiles ─────────────────────────────────────────
const STYLES = ['Marketing', 'Academic', 'Journalistic', 'Creative', 'Technical'];

// ── Detectors we report against ──────────────────────────────
const DETECTORS = [
  { id: 'gptzero',     name: 'GPTZero',        before: 96, after: 4  },
  { id: 'turnitin',    name: 'Turnitin',       before: 88, after: 9  },
  { id: 'copyleaks',   name: 'Copyleaks',      before: 92, after: 7  },
  { id: 'originality', name: 'Originality.ai', before: 99, after: 11 },
];

// ── The sample document, sentence-by-sentence ────────────────
// risk: 'red' (likely AI) | 'amber' (mixed) | 'green' (passes)
// each red/amber sentence carries 3 rewrite alternatives
const SAMPLE_INPUT =
  "In today's fast-paced digital landscape, businesses must leverage cutting-edge solutions to stay ahead of the competition. Artificial intelligence has revolutionized the way companies approach content creation. Moreover, it is important to note that quality remains a key factor in driving engagement. Many organizations have successfully implemented these tools to streamline their workflows and maximize efficiency. Ultimately, the integration of AI represents a paradigm shift in modern marketing.";

const RESULT_SENTENCES = [
  {
    id: 's1',
    text: "Most teams I talk to are scrambling just to keep up — and honestly, the ones winning aren't the loudest, they're the ones who picked the right tools early.",
    risk: 'green', score: 6,
  },
  {
    id: 's2',
    text: "AI changed content work overnight, but not in the way the headlines promised.",
    risk: 'green', score: 9,
  },
  {
    id: 's3',
    text: "Here's the part people skip: quality still decides whether anyone actually reads it.",
    risk: 'amber', score: 34,
    alts: [
      "Here's the part people skip: quality still decides whether anyone actually reads it.",
      "What gets ignored is simple — if it isn't good, nobody finishes it.",
      "The thing nobody mentions? Readers bail the second the writing feels off.",
    ],
  },
  {
    id: 's4',
    text: "Plenty of teams have wired these tools into their workflow and quietly cut hours off every brief.",
    risk: 'green', score: 8,
  },
  {
    id: 's5',
    text: "So the integration of AI represents a fundamental paradigm shift in modern marketing.",
    risk: 'red', score: 78,
    alts: [
      "Which is really the whole point: AI isn't a feature anymore, it's the floor.",
      "Put plainly, AI stopped being optional for marketers somewhere last year.",
      "Call it what you want — the way marketing gets made has already moved.",
    ],
  },
];

// ── Recent history on the dashboard ──────────────────────────
const HISTORY = [
  { id: 'h1', title: 'Q3 product launch email',      words: 642,  before: 94, after: 6,  when: '2h ago',   mode: 'Medium' },
  { id: 'h2', title: 'Landing page — pricing rewrite', words: 1180, before: 88, after: 11, when: 'Yesterday', mode: 'Aggressive' },
  { id: 'h3', title: 'Blog: "SEO in 2026"',           words: 2340, before: 97, after: 8,  when: 'Mon',      mode: 'Ninja' },
  { id: 'h4', title: 'Client proposal draft',          words: 905,  before: 91, after: 5,  when: 'Mon',      mode: 'Medium' },
];

// ── Billing ──────────────────────────────────────────────────
const CREDITS_TOTAL = 15000;
const CREDITS_USED = 2520;

const PLANS = [
  { id: 'starter', name: 'Starter', price: 19,  words: 15000,  features: ['15,000 words / mo', 'All 4 intensity modes', '13 tones · 5 styles', 'Readability engine'] },
  { id: 'pro',     name: 'Pro',     price: 49,  words: 50000,  features: ['50,000 words / mo', 'Auto-refinement loop', 'Bulk & API access', 'Priority processing'], popular: true },
  { id: 'agency',  name: 'Agency',  price: 149, words: 200000, features: ['200,000 words / mo', '5 team seats', 'Shared credit pool', 'Dedicated support'] },
];

// ── The 4-layer humanization pipeline (for the processing view) ─
const PIPELINE = [
  { id: 'l1', label: 'LLM Rewrite',        sub: 'Injecting perplexity & burstiness' },
  { id: 'l2', label: 'Sentence Scoring',   sub: 'Scanning every chunk for AI signal' },
  { id: 'l3', label: 'Auto-Refinement',    sub: 'Re-running the flagged sentences' },
  { id: 'l4', label: 'Readability Pass',   sub: 'Tuning for Flesch ≥ 60' },
];

// ── Readability metrics ──────────────────────────────────────
const READABILITY = {
  fre: 64,        // Flesch Reading Ease (target ≥ 60)
  fkgl: 8.2,      // grade level
  avgSentence: 14.6,
  avgSyllables: 1.52,
  passive: 4,     // % passive voice
};

// ── Icon set (simple stroke glyphs) ──────────────────────────
const ICONS = {
  home:    'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5',
  detect:  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l4.5 4.5',
  wand:    'M5 19 16 8M14 4l1.2 2.6L18 8l-2.8 1.4L14 12l-1.2-2.6L10 8l2.8-1.4L14 4ZM6 13l.7 1.5L8.5 15l-1.8.5L6 17l-.7-1.5L3.5 15l1.8-.5L6 13Z',
  chart:   'M4 20V4M4 20h16M8 20v-6M12.5 20V9M17 20v-9',
  user:    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0',
  copy:    'M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  check:   'M5 12.5 10 17.5 19.5 7',
  chevR:   'M9 5l7 7-7 7',
  chevL:   'M15 5l-7 7 7 7',
  chevD:   'M6 9l6 6 6-6',
  arrowR:  'M5 12h14M13 6l6 6-6 6',
  close:   'M6 6l12 12M18 6 6 18',
  refresh: 'M20 11a8 8 0 1 0-.5 4M20 4v6h-6',
  shield:  'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z',
  bolt:    'M13 3 4 14h6l-1 7 9-11h-6l1-7Z',
  doc:     'M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v4h4',
  plus:    'M12 5v14M5 12h14',
  spark:   'M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z',
  gauge:   'M12 13l4-4M5 19a9 9 0 1 1 14 0',
  lock:    'M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1ZM8 11V8a4 4 0 0 1 8 0v3',
  card:    'M3 7h18a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM2 10h20',
  bell:    'M6 16V10a6 6 0 1 1 12 0v6l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0',
  star:    'M12 4l2.3 4.7L19.5 9.4l-3.75 3.65.9 5.15L12 15.8l-4.65 2.4.9-5.15L4.5 9.4l5.2-.7L12 4Z',
  clock:   'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8v4l3 2',
  layers:  'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 8v0',
  eye:     'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  flame:   'M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 5-6 5-12Z',
  trend:   'M4 16l5-5 3 3 7-7M14 7h5v5',
  upload:  'M12 15V3M8 7l4-4 4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  link:    'M9.5 13.5a4 4 0 0 0 6 .5l2.5-2.5a4 4 0 0 0-5.5-5.5L11 7.5M14.5 10.5a4 4 0 0 0-6-.5L6 12.5a4 4 0 0 0 5.5 5.5L13 16.5',
  clip:    'M9 5h6M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1M9 5a1 1 0 0 1-1 1H7a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1a1 1 0 0 1-1-1',
  grid:    'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
};

// ── Best-practice content library (import → load into editor) ─
const CONTENT_TEMPLATES = [
  {
    id: 'blog', title: 'Blog intro', tag: 'SEO',
    words: 58,
    body: "Search engines changed the rules again this year, and most teams found out the hard way. If your traffic dipped without warning, you're not alone — and the fix isn't more content, it's better-sounding content. Here's exactly what's working in 2026, and the three habits that quietly tank rankings before you ever hit publish.",
  },
  {
    id: 'product', title: 'Product description', tag: 'E-commerce',
    words: 41,
    body: "Built for people who hate fussing with gear. One dial, three settings, and a battery that actually lasts the week. We obsessed over the small stuff — the click of the switch, the weight in your hand — so you never think about it. You just use it.",
  },
  {
    id: 'email', title: 'Cold outreach email', tag: 'Sales',
    words: 47,
    body: "Quick one, Jordan. I noticed your team shipped three landing pages last month — impressive pace. The thing that usually breaks at that speed is consistency of voice across writers. We help marketing teams keep one tone without slowing down. Worth a 15-minute look next week?",
  },
  {
    id: 'landing', title: 'Landing page hero', tag: 'Marketing',
    words: 32,
    body: "Stop sounding like a robot. Run your AI drafts through a humanizer that keeps the meaning, fixes the rhythm, and slips past every detector — so your words read like a person actually wrote them.",
  },
  {
    id: 'social', title: 'Social caption', tag: 'Social',
    words: 38,
    body: "We almost didn't post this. The first draft read like a press release nobody asked for. So we rewrote it the way you'd actually say it out loud — and somehow that's the version that felt true. Funny how that works.",
  },
];

Object.assign(window, {
  MODES, TONES, STYLES, DETECTORS, SAMPLE_INPUT, RESULT_SENTENCES,
  HISTORY, CREDITS_TOTAL, CREDITS_USED, PLANS, PIPELINE, READABILITY, ICONS,
  CONTENT_TEMPLATES,
});
