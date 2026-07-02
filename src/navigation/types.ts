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

export interface HumanizeResult {
  text: string;
  beforeScore: number;
  afterScore: number;
  sentences: HumanizeResultSentence[];
}

export type HumanizeStage = 'idle' | 'pending' | 'done' | 'error';

export interface ScreenProps {
  go: (screen: ScreenName) => void;
}
