import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './theme/ThemeContext';
import { TabBar } from './components/TabBar';
import { ScreenName, EditorState, HumanizeResult, HumanizeStage } from './navigation/types';
import { SAMPLE_INPUT } from './data/content';
import { ApiError, humanize } from './lib/api';

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
    humanize({ text: editor.input, mode: editor.mode, tone: editor.tone, style: editor.style })
      .then(text => {
        setResult({ text });
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

  const noChrome = NO_CHROME.includes(screen);
  const currentTab = TAB_MAP[screen] ?? null;

  const screens: Record<ScreenName, React.ReactNode> = {
    onboarding: <Onboarding go={go} />,
    home:       <Home go={go} />,
    humanize:   <Editor go={go} state={editor} set={setEditorPatch} onSubmit={submitHumanize} />,
    processing: <Processing go={go} stage={humanizeStage} error={humanizeError} onRetry={runHumanize} onCancel={() => go('humanize')} />,
    result:     <Result go={go} />,
    detector:   <Detector go={go} />,
    stats:      <Metrics go={go} />,
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
