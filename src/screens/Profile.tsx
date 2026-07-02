import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Meter } from '../components/Meter';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { useTheme } from '../theme/ThemeContext';
import { CREDITS_TOTAL, CREDITS_USED } from '../data/content';
import { ScreenProps } from '../navigation/types';

function Row({ icon, title, detail, onPress, danger, last, control }: {
  icon: string; title: string; detail?: string; onPress?: () => void; danger?: boolean; last?: boolean; control?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border,
    }}>
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: danger ? theme.riskRedBg : theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} stroke={danger ? theme.riskRed : theme.text} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: danger ? theme.riskRed : theme.text, letterSpacing: -0.2 }}>{title}</Text>
      {detail && <Text style={{ fontSize: 13.5, color: theme.textMuted }}>{detail}</Text>}
      {control}
      {onPress && !control && <Icon name="chevR" size={17} stroke={theme.textFaint} />}
    </Wrapper>
  );
}

function MiniToggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      width: 46, height: 28, borderRadius: 999, padding: 3,
      backgroundColor: on ? theme.riskGreen : theme.borderStrong,
      alignItems: on ? 'flex-end' : 'flex-start',
    }}>
      <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

const APPEARANCE_OPTIONS: Array<{ id: 'light' | 'dark' | 'system'; label: string }> = [
  { id: 'system', label: 'Match system' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function Profile({ go }: ScreenProps) {
  const { theme, preference, setPreference } = useTheme();
  const [privacy, setPrivacy] = useState(true);
  const [notif, setNotif] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const left = CREDITS_TOTAL - CREDITS_USED;
  const appearanceLabel = APPEARANCE_OPTIONS.find(o => o.id === preference)?.label ?? 'Match system';

  return (
    <Screen>
      <Header title="Account" />
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 24 }}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.4, color: theme.text }}>Alex Morgan</Text>
            <Text style={{ fontSize: 13.5, color: theme.textMuted }}>alex@contentlab.co</Text>
          </View>
          <Chip color={theme.accent} bg={theme.accentSoft}>Starter</Chip>
        </View>

        <Card pad={16}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>This month</Text>
            <Text style={{ fontSize: 13, color: theme.textMuted }}>{left.toLocaleString()} / {CREDITS_TOTAL.toLocaleString()} left</Text>
          </View>
          <Meter value={left} max={CREDITS_TOTAL} />
          <View style={{ marginTop: 14 }}>
            <Button variant="soft" size="sm" full icon="bolt" onPress={() => go('pricing')}>Upgrade plan</Button>
          </View>
        </Card>

        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textFaint, textTransform: 'uppercase', letterSpacing: 0.4, paddingBottom: 8, paddingHorizontal: 4 }}>Preferences</Text>
          <Card pad={0}>
            <Row icon="shield" title="Privacy-first mode" control={<MiniToggle on={privacy} onPress={() => setPrivacy(!privacy)} />} />
            <Row icon="bell" title="Notifications" control={<MiniToggle on={notif} onPress={() => setNotif(!notif)} />} />
            <Row icon="eye" title="Appearance" detail={appearanceLabel} onPress={() => setAppearanceOpen(true)} last />
          </Card>
        </View>

        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.textFaint, textTransform: 'uppercase', letterSpacing: 0.4, paddingBottom: 8, paddingHorizontal: 4 }}>Billing</Text>
          <Card pad={0}>
            <Row icon="card" title="Plans & pricing" onPress={() => go('pricing')} />
            <Row icon="clock" title="Usage history" />
            <Row icon="doc" title="Invoices" last />
          </Card>
        </View>

        <Card pad={0}>
          <Row icon="close" title="Sign out" danger onPress={() => go('onboarding')} last />
        </Card>
        <Text style={{ textAlign: 'center', fontSize: 12, color: theme.textFaint, paddingBottom: 24 }}>AI Humanizer · v1.0.0</Text>
      </View>

      <Sheet open={appearanceOpen} onClose={() => setAppearanceOpen(false)} title="Appearance">
        <View style={{ gap: 2, paddingBottom: 8 }}>
          {APPEARANCE_OPTIONS.map(o => {
            const active = o.id === preference;
            return (
              <Pressable key={o.id} onPress={() => { setPreference(o.id); setAppearanceOpen(false); }} style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12,
                backgroundColor: active ? theme.accentSoft : 'transparent',
              }}>
                <Text style={{ fontSize: 16, fontWeight: active ? '700' : '500', color: active ? theme.accent : theme.text }}>{o.label}</Text>
                {active && <Icon name="check" size={19} stroke={theme.accent} sw={2.2} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Screen>
  );
}
