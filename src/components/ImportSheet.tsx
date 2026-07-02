import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { Chip } from './Chip';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeContext';
import { CONTENT_TEMPLATES, SAMPLE_INPUT } from '../data/content';

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  onImport: (text: string) => void;
}

type Status = { kind: 'loading' | 'error'; msg: string } | null;

export function ImportSheet({ open, onClose, onImport }: ImportSheetProps) {
  const { theme } = useTheme();
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>(null);

  const reset = () => { setUrlMode(false); setUrl(''); setStatus(null); };
  const close = () => { reset(); onClose(); };

  const browse = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'text/markdown', 'application/msword', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const file = res.assets[0];
    const isText = /\.(txt|md|text|markdown|rtf)$/i.test(file.name);
    if (isText) {
      const text = await FileSystem.readAsStringAsync(file.uri);
      onImport(text.trim());
      reset();
    } else {
      setStatus({ kind: 'loading', msg: `Extracting text from ${file.name}…` });
      setTimeout(() => { onImport(SAMPLE_INPUT); reset(); }, 1300);
    }
  };

  const pasteClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text && text.trim()) { onImport(text.trim()); reset(); }
    else setStatus({ kind: 'error', msg: 'Clipboard is empty — copy some text first.' });
  };

  const fetchUrl = () => {
    if (!url.trim()) return;
    setStatus({ kind: 'loading', msg: 'Fetching & cleaning the page…' });
    setTimeout(() => { onImport(CONTENT_TEMPLATES[0].body); reset(); }, 1400);
  };

  const tile = (icon: string, label: string, onPress: () => void, active?: boolean) => (
    <Pressable onPress={onPress} style={{
      flex: 1, alignItems: 'center', gap: 7, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 14,
      backgroundColor: active ? theme.accentSoft : theme.surface2,
      borderWidth: 1, borderColor: active ? theme.accent : 'transparent',
    }}>
      <Icon name={icon} size={21} stroke={active ? theme.accent : theme.text} />
      <Text style={{ fontSize: 12.5, fontWeight: '600', letterSpacing: -0.1, color: active ? theme.accent : theme.text }}>{label}</Text>
    </Pressable>
  );

  return (
    <Sheet open={open} onClose={close} title="Add content">
      <View style={{ gap: 14, paddingBottom: 6 }}>
        <Pressable onPress={browse} style={{
          alignItems: 'center', gap: 8, paddingVertical: 26, paddingHorizontal: 18, borderRadius: 16,
          borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.borderStrong, backgroundColor: theme.surface2,
        }}>
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="upload" size={24} stroke="#fff" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, letterSpacing: -0.2 }}>Tap to browse a file</Text>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>TXT · MD · DOCX · PDF — up to 25,000 words</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {tile('clip', 'Paste from clipboard', pasteClipboard)}
          {tile('link', 'Import from URL', () => { setUrlMode(v => !v); setStatus(null); }, urlMode)}
        </View>

        {urlMode && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={url} onChangeText={setUrl} placeholder="https://example.com/article"
              placeholderTextColor={theme.textFaint}
              style={{ flex: 1, height: 44, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radii.md, paddingHorizontal: 13, fontSize: 14.5, backgroundColor: theme.surface, color: theme.text }}
            />
            <Button size="md" onPress={fetchUrl} disabled={!url.trim()}>Import</Button>
          </View>
        )}

        {status && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 9,
            backgroundColor: status.kind === 'error' ? theme.riskRedBg : theme.surface2,
            padding: 13, borderRadius: 11,
          }}>
            {status.kind === 'loading' && <ActivityIndicator size="small" color={theme.accent} />}
            <Text style={{ fontSize: 13, fontWeight: '600', color: status.kind === 'error' ? theme.riskRed : theme.textMuted }}>{status.msg}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <Icon name="spark" size={15} stroke={theme.accent} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>Or start from a best-practice example</Text>
        </View>
        <View style={{ gap: 8 }}>
          {CONTENT_TEMPLATES.map(tpl => (
            <Pressable key={tpl.id} onPress={() => { onImport(tpl.body); reset(); }} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 14, padding: 14,
            }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="doc" size={17} stroke={theme.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '600', color: theme.text, letterSpacing: -0.2 }}>{tpl.title}</Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>{tpl.body.slice(0, 52)}…</Text>
              </View>
              <Chip>{tpl.tag}</Chip>
            </Pressable>
          ))}
        </View>
      </View>
    </Sheet>
  );
}
