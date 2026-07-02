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

export interface ScreenProps {
  go: (screen: ScreenName) => void;
}
