import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { PickerField } from '../components/PickerField';
import { ImportSheet } from '../components/ImportSheet';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeContext';
import { MODES, TONES, STYLES, SAMPLE_INPUT, CREDITS_TOTAL, CREDITS_USED } from '../data/content';
import { EditorState, ScreenProps } from '../navigation/types';

interface EditorProps extends ScreenProps {
  state: EditorState;
  set: (patch: Partial<EditorState>) => void;
}

export function Editor({ go, state, set }: EditorProps) {
  const { theme } = useTheme();
  const [importOpen, setImportOpen] = useState(false);
  const words = state.input.trim() ? state.input.trim().split(/\s+/).length : 0;
  const modeObj = MODES.find(m => m.id === state.mode)!;

  return (
    <Screen pb={120}>
      <Header title="Humanize" sub="Paste your AI draft, pick a vibe, hit go." />

      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textMuted }}>Original text</Text>
            <Pressable onPress={() => setImportOpen(true)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: theme.accentSoft, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10,
            }}>
              <Icon name="upload" size={14} stroke={theme.accent} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.accent }}>Import</Text>
            </Pressable>
          </View>
          {state.input.trim() === '' ? (
            <Pressable onPress={() => setImportOpen(true)} style={{
              minHeight: 158, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20,
            }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="upload" size={22} stroke={theme.accent} />
              </View>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: theme.text }}>Import or paste your content</Text>
              <Text style={{ fontSize: 12.5, color: theme.textMuted, textAlign: 'center' }}>Upload a file, paste from clipboard, or pick an example</Text>
            </Pressable>
          ) : (
            <TextInput
              value={state.input}
              onChangeText={t => set({ input: t })}
              placeholder="Paste the text you want to humanize…"
              placeholderTextColor={theme.textFaint}
              multiline
              style={{ minHeight: 158, padding: 15, fontSize: 15, lineHeight: 22, color: theme.text }}
            />
          )}
          <View style={{ paddingHorizontal: 15, paddingBottom: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ marginRight: 'auto' }}><Chip>{words} words</Chip></View>
            <Pressable onPress={() => set({ input: SAMPLE_INPUT })} style={{ backgroundColor: theme.accentSoft, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 11 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.accent }}>Use sample</Text>
            </Pressable>
            <Pressable onPress={() => set({ input: '' })} style={{ backgroundColor: theme.surface2, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 11 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.textMuted }}>Clear</Text>
            </Pressable>
          </View>
        </Card>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2, color: theme.text }}>Intensity</Text>
            <Text style={{ fontSize: 12.5, color: theme.textMuted }}>{modeObj.blurb}</Text>
          </View>
          <Segmented options={MODES} value={state.mode} onChange={v => set({ mode: v })} getId={m => m.id} getLabel={m => m.label} />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PickerField label="Tone" value={state.tone} options={TONES} onPick={v => set({ tone: v })} />
          <PickerField label="Style" value={state.style} options={STYLES} onPick={v => set({ style: v })} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Icon name="spark" size={16} stroke={theme.textMuted} />
            <Text style={{ fontSize: 13.5, color: theme.textMuted }}>Cost: <Text style={{ color: theme.text, fontWeight: '700' }}>{words} words</Text></Text>
          </View>
          <Text style={{ fontSize: 13.5, color: theme.textMuted }}>{(CREDITS_TOTAL - CREDITS_USED).toLocaleString()} left</Text>
        </View>

        <Button full size="lg" icon="wand" disabled={words === 0} onPress={() => go('processing')}>
          Humanize {words > 0 ? `${words} words` : 'text'}
        </Button>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="lock" size={13} stroke={theme.textFaint} />
          <Text style={{ color: theme.textFaint, fontSize: 12 }}>Privacy-first · text never stored on our servers</Text>
        </View>
      </View>

      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} onImport={(text) => { set({ input: text }); setImportOpen(false); }} />
    </Screen>
  );
}
