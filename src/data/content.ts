export type Risk = 'red' | 'amber' | 'green';

export interface Mode { id: string; label: string; blurb: string; }
export const MODES: Mode[] = [
  { id: 'light',      label: 'Light',      blurb: 'Gentle touch-ups. Keeps your voice almost intact.' },
  { id: 'medium',     label: 'Medium',     blurb: 'Balanced rewrite. Best for most content.' },
  { id: 'aggressive', label: 'Aggressive', blurb: 'Deep restructuring to break statistical patterns.' },
  { id: 'ninja',      label: 'Ninja',      blurb: 'Maximum entropy. For the strictest detectors.' },
];

export const TONES: string[] = [
  'Conversational', 'Persuasive', 'Professional', 'Friendly', 'Confident',
  'Witty', 'Empathetic', 'Bold', 'Informative', 'Storytelling',
  'Authoritative', 'Inspirational', 'Casual',
];

export const STYLES: string[] = ['Marketing', 'Academic', 'Journalistic', 'Creative', 'Technical'];

export interface Detector { id: string; name: string; before: number; after: number; }
export const DETECTORS: Detector[] = [
  { id: 'gptzero',     name: 'GPTZero',        before: 96, after: 4 },
  { id: 'turnitin',    name: 'Turnitin',       before: 88, after: 9 },
  { id: 'copyleaks',   name: 'Copyleaks',      before: 92, after: 7 },
  { id: 'originality', name: 'Originality.ai', before: 99, after: 11 },
];

export const SAMPLE_INPUT =
  "In today's fast-paced digital landscape, businesses must leverage cutting-edge solutions to stay ahead of the competition. Artificial intelligence has revolutionized the way companies approach content creation. Moreover, it is important to note that quality remains a key factor in driving engagement. Many organizations have successfully implemented these tools to streamline their workflows and maximize efficiency. Ultimately, the integration of AI represents a paradigm shift in modern marketing.";

export interface ResultSentence {
  id: string;
  text: string;
  risk: Risk;
  score: number;
  alts?: string[] | null;
}

export const RESULT_SENTENCES: ResultSentence[] = [
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

export interface DetectSentence { id: string; text: string; risk: Risk; score: number; }
export const DETECT_SENTENCES: DetectSentence[] = [
  { id: 'd1', text: "In today's fast-paced digital landscape, businesses must leverage cutting-edge solutions to stay ahead of the competition.", risk: 'red', score: 97 },
  { id: 'd2', text: "Artificial intelligence has revolutionized the way companies approach content creation.", risk: 'red', score: 91 },
  { id: 'd3', text: "Moreover, it is important to note that quality remains a key factor in driving engagement.", risk: 'red', score: 95 },
  { id: 'd4', text: "Many organizations have successfully implemented these tools to streamline their workflows.", risk: 'amber', score: 52 },
  { id: 'd5', text: "Ultimately, the integration of AI represents a paradigm shift in modern marketing.", risk: 'red', score: 89 },
];

export interface HistoryItem { id: string; title: string; words: number; before: number; after: number; when: string; mode: string; }
export const HISTORY: HistoryItem[] = [
  { id: 'h1', title: 'Q3 product launch email',       words: 642,  before: 94, after: 6,  when: '2h ago',    mode: 'Medium' },
  { id: 'h2', title: 'Landing page — pricing rewrite', words: 1180, before: 88, after: 11, when: 'Yesterday', mode: 'Aggressive' },
  { id: 'h3', title: 'Blog: "SEO in 2026"',            words: 2340, before: 97, after: 8,  when: 'Mon',       mode: 'Ninja' },
  { id: 'h4', title: 'Client proposal draft',          words: 905,  before: 91, after: 5,  when: 'Mon',       mode: 'Medium' },
];

export const CREDITS_TOTAL = 15000;
export const CREDITS_USED = 2520;

export interface Plan { id: string; name: string; price: number; words: number; features: string[]; popular?: boolean; }
export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 19,  words: 15000,  features: ['15,000 words / mo', 'All 4 intensity modes', '13 tones · 5 styles', 'Readability engine'] },
  { id: 'pro',     name: 'Pro',     price: 49,  words: 50000,  features: ['50,000 words / mo', 'Auto-refinement loop', 'Bulk & API access', 'Priority processing'], popular: true },
  { id: 'agency',  name: 'Agency',  price: 149, words: 200000, features: ['200,000 words / mo', '5 team seats', 'Shared credit pool', 'Dedicated support'] },
];

export interface PipelineStep { id: string; label: string; sub: string; }
export const PIPELINE: PipelineStep[] = [
  { id: 'l1', label: 'LLM Rewrite',      sub: 'Injecting perplexity & burstiness' },
  { id: 'l2', label: 'Sentence Scoring', sub: 'Scanning every chunk for AI signal' },
  { id: 'l3', label: 'Auto-Refinement',  sub: 'Re-running the flagged sentences' },
  { id: 'l4', label: 'Readability Pass', sub: 'Tuning for Flesch ≥ 60' },
];

export const READABILITY = {
  fre: 64,
  fkgl: 8.2,
  avgSentence: 14.6,
  avgSyllables: 1.52,
  passive: 4,
};

export interface ContentTemplate { id: string; title: string; tag: string; words: number; body: string; }
export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'blog', title: 'Blog intro', tag: 'SEO', words: 58,
    body: "Search engines changed the rules again this year, and most teams found out the hard way. If your traffic dipped without warning, you're not alone — and the fix isn't more content, it's better-sounding content. Here's exactly what's working in 2026, and the three habits that quietly tank rankings before you ever hit publish.",
  },
  {
    id: 'product', title: 'Product description', tag: 'E-commerce', words: 41,
    body: "Built for people who hate fussing with gear. One dial, three settings, and a battery that actually lasts the week. We obsessed over the small stuff — the click of the switch, the weight in your hand — so you never think about it. You just use it.",
  },
  {
    id: 'email', title: 'Cold outreach email', tag: 'Sales', words: 47,
    body: "Quick one, Jordan. I noticed your team shipped three landing pages last month — impressive pace. The thing that usually breaks at that speed is consistency of voice across writers. We help marketing teams keep one tone without slowing down. Worth a 15-minute look next week?",
  },
  {
    id: 'landing', title: 'Landing page hero', tag: 'Marketing', words: 32,
    body: "Stop sounding like a robot. Run your AI drafts through a humanizer that keeps the meaning, fixes the rhythm, and slips past every detector — so your words read like a person actually wrote them.",
  },
  {
    id: 'social', title: 'Social caption', tag: 'Social', words: 38,
    body: "We almost didn't post this. The first draft read like a press release nobody asked for. So we rewrote it the way you'd actually say it out loud — and somehow that's the version that felt true. Funny how that works.",
  },
];
