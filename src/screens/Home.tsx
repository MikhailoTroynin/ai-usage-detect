import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { useTheme } from '../theme/ThemeContext';
import { CREDITS_TOTAL, CREDITS_USED, HISTORY } from '../data/content';
import { ScreenProps } from '../navigation/types';

export function BalanceCard() {
  const { theme } = useTheme();
  const left = CREDITS_TOTAL - CREDITS_USED;
  const pct = (CREDITS_USED / CREDITS_TOTAL) * 100;
  return (
    <Card pad={18} style={{ backgroundColor: theme.accent, borderWidth: 0 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ fontSize: 12.5, opacity: 0.85, fontWeight: '700', color: '#fff', letterSpacing: 0.2 }}>WORDS REMAINING</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -1.2, marginTop: 6, color: '#fff' }}>
            {left.toLocaleString('en-US')}
          </Text>
        </View>
        <Chip color="#fff" bg="rgba(255,255,255,0.2)" icon={<Icon name="spark" size={13} fill="#fff" stroke="#fff" sw={0} />}>
          Starter
        </Chip>
      </View>
      <View style={{ marginTop: 16 }}>
        <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#fff', borderRadius: 999 }} />
        </View>
        <Text style={{ fontSize: 12, opacity: 0.85, marginTop: 8, fontWeight: '600', color: '#fff' }}>
          {CREDITS_USED.toLocaleString()} of {CREDITS_TOTAL.toLocaleString()} used this month
        </Text>
      </View>
    </Card>
  );
}

export function Home({ go }: ScreenProps) {
  const { theme } = useTheme();
  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontWeight: '600' }}>Good morning</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.7, color: theme.text }}>Alex Morgan</Text>
        </View>
        <Pressable onPress={() => go('profile')} style={{ width: 44, height: 44, borderRadius: 999 }}>
          <View style={{
            width: 44, height: 44, borderRadius: 999, backgroundColor: theme.accent,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>A</Text>
          </View>
          <View style={{ position: 'absolute', top: 0, right: 0, width: 11, height: 11, borderRadius: 999, backgroundColor: theme.riskGreen, borderWidth: 2, borderColor: theme.bg }} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 14 }}>
        <BalanceCard />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card onPress={() => go('humanize')} pad={16} style={{ flex: 1, minHeight: 116, justifyContent: 'space-between', gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wand" size={21} stroke={theme.accent} />
            </View>
            <View>
              <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: theme.text }}>Humanize text</Text>
              <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>Rewrite an AI draft</Text>
            </View>
          </Card>
          <Card onPress={() => go('detector')} pad={16} style={{ flex: 1, minHeight: 116, justifyContent: 'space-between', gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="detect" size={21} stroke={theme.text} />
            </View>
            <View>
              <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: theme.text }}>AI detector</Text>
              <Text style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>Check before you ship</Text>
            </View>
          </Card>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', letterSpacing: -0.4, color: theme.text }}>Recent</Text>
          <Text style={{ fontSize: 13.5, color: theme.accent, fontWeight: '600' }}>See all</Text>
        </View>
        <Card pad={0}>
          {HISTORY.map((h, i) => (
            <Pressable key={h.id} onPress={() => go('result')} style={{
              flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14,
              borderBottomWidth: i < HISTORY.length - 1 ? 1 : 0, borderBottomColor: theme.border,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="doc" size={19} stroke={theme.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '600', letterSpacing: -0.2, color: theme.text }}>{h.title}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{h.words.toLocaleString()} words · {h.when} · {h.mode}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.riskRed }}>{h.before}</Text>
                <Icon name="arrowR" size={13} stroke={theme.textFaint} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.riskGreen }}>{h.after}%</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
