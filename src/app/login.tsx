import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

type Phase = 'email' | 'code';

export default function LoginScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = /^\S+@\S+\.\S+$/.test(email.trim());

  const sendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setPhase('code');
    } catch {
      setError('Something went wrong sending your code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      if (verifyError || !data.session) {
        setError(verifyError?.message ?? 'That code was invalid. Try again.');
        return;
      }
      router.replace('/find-building');
    } catch {
      setError('Something went wrong verifying your code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Sign in</Text>

        {phase === 'email' ? (
          <>
            <Text style={styles.title}>What&apos;s your email?</Text>
            <Text style={styles.description}>
              We&apos;ll send you a 6-digit code to confirm it&apos;s you. No
              password needed.
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9B8CAF"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              inputMode="email"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[
                styles.primaryButton,
                (!emailLooksValid || loading) && styles.primaryButtonDisabled,
              ]}
              disabled={!emailLooksValid || loading}
              onPress={sendCode}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.description}>
              We sent a 6-digit code to {email.trim()}. Enter it below.
            </Text>

            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor="#9B8CAF"
              style={[styles.input, styles.codeInput]}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[
                styles.primaryButton,
                (code.trim().length < 6 || loading) &&
                  styles.primaryButtonDisabled,
              ]}
              disabled={code.trim().length < 6 || loading}
              onPress={verifyCode}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & continue</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              disabled={loading}
              onPress={() => {
                setCode('');
                setError(null);
                setPhase('email');
              }}
            >
              <Text style={styles.secondaryButtonText}>Use a different email</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2FF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  eyebrow: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6D28D9',
    marginBottom: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#67597F',
    lineHeight: 23,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F1438',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    marginBottom: 18,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 15,
    color: '#B4243F',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#6D28D9',
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6D28D9',
    fontSize: 16,
    fontWeight: '700',
  },
});
