import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // A returning user is identified by phone number plus their name. The actual
  // sign-in stays disabled until we verify the phone by text: without that,
  // phone + name is not a secret and anyone could sign in as someone else.
  const digits = phone.replace(/\D/g, '');
  const canContinue = digits.length >= 7 && name.trim().length > 0;

  const handleContinue = () => {
    setNotice(
      "Signing in by text is coming soon. For now, open Knock on the device where you first joined to stay signed in.",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.description}>
          Enter your phone number and name to find your account. We&apos;ll text
          you a code to confirm it&apos;s you.
        </Text>

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setNotice(null);
          }}
          placeholder="(555) 123-4567"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="tel"
        />

        <Text style={styles.label}>Full name or display name</Text>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            setNotice(null);
          }}
          placeholder="Your name"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
        />

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Pressable
          style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
          disabled={!canContinue}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>Send verification code</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace('/find-building')}
        >
          <Text style={styles.secondaryButtonText}>
            New here? Create an account
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700', marginBottom: 18 },
  eyebrow: { fontSize: 15, fontWeight: '800', color: '#6D28D9', marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', color: '#1F1438', marginBottom: 12 },
  description: {
    fontSize: 16,
    color: '#67597F',
    lineHeight: 23,
    marginBottom: 26,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A3D63',
    marginBottom: 8,
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
  notice: {
    fontSize: 15,
    color: '#6D28D9',
    lineHeight: 22,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#6D28D9',
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  secondaryButton: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  secondaryButtonText: { color: '#6D28D9', fontSize: 16, fontWeight: '700' },
});
