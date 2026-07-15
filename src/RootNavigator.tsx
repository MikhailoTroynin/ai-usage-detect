import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './theme/ThemeContext';
import { TabBar } from './components/TabBar';
import { ScreenName, EditorState, HumanizeDetector, HumanizeResult, HumanizeStage } from './navigation/types';
import { SAMPLE_INPUT, UNAVAILABLE_DETECTORS } from './data/content';
import { ApiError, DetectResult, detect, humanize } from './lib/api';

import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Editor } from './screens/Editor';
import { Processing } from './screens/Processing';
import { Result } from './screens/Result';
import { Detector } from './screens/Detector';
import { Metrics } from './screens/Metrics';
import { Pricing } from './screens/Pricing';
import { Profile } from './screens/Profile';

// Merge the per-provider rows from the original ("before") and humanized
// ("after") /detect calls into one list for the Result → Detectors card. A
// provider only contributes a number for a scan where it was actually available;
// otherwise that side is null and the card shows "N/A". Known brands with no live
// API (Turnitin) are appended as permanent N/A rows so we surface them honestly
// instead of dropping them or faking a score.
function buildDetectors(before: DetectResult | null, after: DetectResult | null): HumanizeDetector[] {
  const beforeById = new Map((before?.providers ?? []).map(p => [p.id, p]));
  const afterById = new Map((after?.providers ?? []).map(p => [p.id, p]));

  // Preserve backend order, prioritizing the humanized ("after") scan since that
  // is the one the card is really about; add any provider only seen in "before".
  const order: string[] = [];
  const seen = new Set<string>();
  for (const p of [...(after?.providers ?? []), ...(before?.providers ?? [])]) {
    if (!seen.has(p.id)) { seen.add(p.id); order.push(p.id); }
  }

  const detectors: HumanizeDetector[] = order.map(id => {
    const a = afterById.get(id);
    const b = beforeById.get(id);
    const meta = a ?? b!; // id came from one of the two maps, so at least one is set
    return {
      id,
      name: meta.name,
      before: b?.available ? b.score : null,
      after: a?.available ? a.score : null,
      available: Boolean(a?.available || b?.available),
    };
  });

  for (const brand of UNAVAILABLE_DETECTORS) {
    if (!seen.has(brand.id)) {
      detectors.push({ id: brand.id, name: brand.name, before: null, after: null, available: false });
    }
  }
  return detectors;
}

const NO_CHROME: ScreenName[] = ['onboarding', 'processing'];
const TAB_MAP: Partial<Record<ScreenName, ScreenName>> = {
  home: 'home', detector: 'detector', stats: 'stats', profile: 'profile', pricing: 'profile',
};

export function RootNavigator() {
  const { theme } = useTheme();
  const [screen, setScreen] = useState<ScreenName>('onboarding');
  const [editor, setEditor] = useState<EditorState>({
    input: SAMPLE_INPUT, mode: 'medium', tone: 'Conversational', style: 'Marketing',
  });
  const [humanizeStage, setHumanizeStage] = useState<HumanizeStage>('idle');
  const [humanizeError, setHumanizeError] = useState<string | null>(null);
  const [result, setResult] = useState<HumanizeResult | null>(null);

  const setEditorPatch = (patch: Partial<EditorState>) => setEditor(s => ({ ...s, ...patch }));
  const go = (s: ScreenName) => setScreen(s);

  const runHumanize = () => {
    setHumanizeStage('pending');
    setHumanizeError(null);
    const originalInput = editor.input;
    humanize({ text: originalInput, mode: editor.mode, tone: editor.tone, style: editor.style })
      .then(async text => {
        // Scoring is a nice-to-have on top of the rewrite: if /detect is flaky or
        // down, still surface the humanized text rather than throwing it away and
        // forcing a full (expensive) re-humanize just to retry the score lookup.
        const [beforeRes, afterRes] = await Promise.allSettled([detect(originalInput), detect(text)]);
        const before = beforeRes.status === 'fulfilled' ? beforeRes.value : null;
        const after = afterRes.status === 'fulfilled' ? afterRes.value : null;
        const sentences = after && after.sentences.length > 0
          ? after.sentences.map((s, i) => ({ id: `s${i}`, text: s.text, risk: s.risk, score: s.score, alts: null }))
          : [{ id: 's0', text, risk: after?.risk ?? 'green', score: after?.overallScore ?? 0, alts: null }];
        setResult({
          text,
          beforeScore: before?.overallScore ?? 0,
          afterScore: after?.overallScore ?? 0,
          sentences,
          detectors: buildDetectors(before, after),
        });
        setHumanizeStage('done');
      })
      .catch(err => {
        setHumanizeError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        setHumanizeStage('error');
      });
  };

  const submitHumanize = () => {
    go('processing');
    runHumanize();
  };

  // Sign-in is temporarily disabled app-wide: the free Supabase tier can't be
  // configured for the email-OTP flow (custom SMTP requires a paid plan), so
  // the product is open without authorization for now. See src/screens/Auth.tsx
  // and supabase/functions/_shared/auth.ts to re-enable once that's sorted.
  const noChrome = NO_CHROME.includes(screen);
  const currentTab = TAB_MAP[screen] ?? null;

  const screens: Record<ScreenName, React.ReactNode> = {
    onboarding: <Onboarding go={go} />,
    home:       <Home go={go} />,
    humanize:   <Editor go={go} state={editor} set={setEditorPatch} onSubmit={submitHumanize} />,
    processing: <Processing go={go} stage={humanizeStage} error={humanizeError} onRetry={runHumanize} onCancel={() => go('humanize')} />,
    result:     <Result go={go} result={result} />,
    detector:   <Detector go={go} />,
    stats:      <Metrics go={go} result={result} />,
    pricing:    <Pricing go={go} />,
    profile:    <Profile go={go} />,
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.root}>{screens[screen]}</View>
      {!noChrome && <TabBar current={currentTab} onNav={go} onHumanize={() => go('humanize')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
