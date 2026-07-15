import { Risk } from '../data/content';

export type ScreenName =
  | 'onboarding'
  | 'home'
  | 'humanize'
  | 'processing'
  | 'result'
  | 'detector'
  | 'stats'
  | 'pricing'
  | 'profile';

export interface EditorState {
  input: string;
  mode: string;
  tone: string;
  style: string;
}

export interface HumanizeResultSentence {
  id: string;
  text: string;
  risk: Risk;
  score: number;
  alts?: string[] | null;
}

// One row on the Result → "Detectors" card: a single provider's before/after
// AI scores. `before`/`after` are null when that scan wasn't available for the
// provider (missing key, timeout, 429, or no live API at all), in which case the
// card renders "N/A" instead of a misleading 0. Built from the backend
// `providers[]` of the original and humanized `/detect` calls.
export interface HumanizeDetector {
  id: string;
  name: string;
  before: number | null;
  after: number | null;
  available: boolean;
}

export interface HumanizeResult {
  text: string;
  beforeScore: number;
  afterScore: number;
  sentences: HumanizeResultSentence[];
  detectors: HumanizeDetector[];
}

export type HumanizeStage = 'idle' | 'pending' | 'done' | 'error';

export interface ScreenProps {
  go: (screen: ScreenName) => void;
}
