import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './theme/ThemeContext';
import { TabBar } from './components/TabBar';
import { ScreenName, EditorState, HumanizeResult, HumanizeStage } from './navigation/types';
import { SAMPLE_INPUT } from './data/content';
import { ApiError, detect, humanize } from './lib/api';

import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Editor } from './screens/Editor';
import { Processing } from './screens/Processing';
import { Result } from './screens/Result';
import { Detector } from './screens/Detector';
import { Metrics } from './screens/Metrics';
import { Pricing } from './screens/Pricing';
import { Profile } from './screens/Profile';

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
        setResult({ text, beforeScore: before?.overallScore ?? 0, afterScore: after?.overallScore ?? 0, sentences });
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
