import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { useTheme } from '../theme/ThemeContext';
import { sendCode, verifyCode, isAuthConfigured } from '../lib/supabase';

type Step = 'email' | 'code';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Sign-in gate (PLAN.md item 13). Email one-time-code flow: enter email → get a
 * code by email → enter code. On success the session is stored and the app
 * shows its normal screens.
 */
export function Auth() {
  const { theme } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isAuthConfigured();

  const submitEmail = async () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email, code);
      // On success the session listener flips the app to its normal screens.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    height: 52,
    paddingHorizontal: 15,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface2,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
  } as const;

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 22, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <Logo size={44} />
        <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 16, letterSpacing: -0.4 }}>
          {step === 'email' ? 'Sign in to continue' : 'Enter your code'}
        </Text>
        <Text style={{ fontSize: 14.5, color: theme.textMuted, marginTop: 6, textAlign: 'center' }}>
          {step === 'email'
            ? 'We’ll email you a 6-digit code — no password needed.'
            : `We sent a code to ${email}.`}
        </Text>
      </View>

      <Card style={{ padding: 18, gap: 14 }}>
        {!configured && (
          <Text style={{ fontSize: 13.5, color: theme.riskAmber }}>
            Sign-in isn’t configured yet. Set EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart the app.
          </Text>
        )}

        {step === 'email' ? (
          <TextInput
            value={email}
            onChangeText={t => { setEmail(t); setError(null); }}
            placeholder="you@example.com"
            placeholderTextColor={theme.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy && configured}
            onSubmitEditing={submitEmail}
            style={inputStyle}
          />
        ) : (
          <TextInput
            value={code}
            onChangeText={t => { setCode(t.replace(/[^0-9]/g, '')); setError(null); }}
            placeholder="123456"
            placeholderTextColor={theme.textFaint}
            keyboardType="number-pad"
            maxLength={6}
            editable={!busy}
            onSubmitEditing={submitCode}
            style={[inputStyle, { letterSpacing: 6, textAlign: 'center', fontSize: 20 }]}
          />
        )}

        {error && <Text style={{ fontSize: 13.5, color: theme.riskRed }}>{error}</Text>}

        <Button
          full
          size="lg"
          disabled={busy || !configured}
          onPress={step === 'email' ? submitEmail : submitCode}
        >
          {busy ? <ActivityIndicator color="#fff" /> : step === 'email' ? 'Send code' : 'Verify & continue'}
        </Button>

        {step === 'code' && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={() => { setStep('email'); setCode(''); setError(null); }} disabled={busy}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.textMuted }}>Change email</Text>
            </Pressable>
            <Pressable onPress={submitEmail} disabled={busy}>
              <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.accent }}>Resend code</Text>
            </Pressable>
          </View>
        )}
      </Card>
    </Screen>
  );
}
