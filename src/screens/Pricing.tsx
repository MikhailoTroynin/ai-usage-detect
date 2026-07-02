import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeContext';
import { PLANS } from '../data/content';
import { ScreenProps } from '../navigation/types';

const BILLING_OPTIONS = [
  { id: false, l: 'Monthly' },
  { id: true, l: 'Annual · -20%' },
];

export function Pricing({ go }: ScreenProps) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState('pro');
  const [annual, setAnnual] = useState(false);
  const selectedPlan = PLANS.find(p => p.id === selected)!;

  return (
    <Screen pb={120}>
      <Header title="Plans" sub="Scale your word budget as you grow." onBack={() => go('profile')} />
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: '100%' }}>
            <Segmented options={BILLING_OPTIONS} value={annual} onChange={setAnnual} getId={o => o.id} getLabel={o => o.l} />
          </View>
        </View>

        {PLANS.map(p => {
          const active = selected === p.id;
          const price = annual ? Math.round(p.price * 0.8) : p.price;
          return (
            <Card key={p.id} onPress={() => setSelected(p.id)} pad={18} style={{
              borderWidth: active ? 2 : 1, borderColor: active ? theme.accent : theme.border,
            }}>
              {p.popular && (
                <View style={{ position: 'absolute', top: -10, right: 18, backgroundColor: theme.accent, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 }}>POPULAR</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.4, color: theme.text }}>{p.name}</Text>
                  <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>{p.words.toLocaleString()} words / mo</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', letterSpacing: -1, color: theme.text }}>
                    ${price}<Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '600' }}>/mo</Text>
                  </Text>
                </View>
              </View>
              <View style={{ gap: 8, marginTop: 14 }}>
                {p.features.map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <Icon name="check" size={16} sw={2.4} stroke={theme.accent} />
                    <Text style={{ fontSize: 13.5, color: theme.text }}>{f}</Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })}

        <Button full size="lg" icon="bolt" onPress={() => go('profile')}>
          {selected === 'starter' ? 'Stay on current plan' : `Upgrade to ${selectedPlan.name}`}
        </Button>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="card" size={14} stroke={theme.textFaint} />
          <Text style={{ color: theme.textFaint, fontSize: 12 }}>Secured by Stripe · cancel anytime</Text>
        </View>
      </View>
    </Screen>
  );
}
