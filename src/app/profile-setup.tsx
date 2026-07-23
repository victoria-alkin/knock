import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pickAndUploadAvatar } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';

/** Make sure an (anonymous) session exists before uploading or saving. */
async function ensureSignedIn(): Promise<{ error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return {};
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return { error: `Could not start a session: ${error.message}` };
  return {};
}

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { placeId, name, address, latitude, longitude } =
    useLocalSearchParams<{
      placeId?: string;
      name?: string;
      address?: string;
      latitude?: string;
      longitude?: string;
    }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [inDirectory, setInDirectory] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Establish the anonymous session up front so photo upload works before the
  // profile is finished.
  useEffect(() => {
    ensureSignedIn();
  }, []);

  const handlePickAvatar = async () => {
    setUploadingAvatar(true);
    setError(null);
    const { error: authError } = await ensureSignedIn();
    if (authError) {
      setError(authError);
      setUploadingAvatar(false);
      return;
    }
    const { url, error: uploadError } = await pickAndUploadAvatar();
    if (url) setAvatarUrl(url);
    else if (uploadError) setError(uploadError);
    setUploadingAvatar(false);
  };

  const canSubmit =
    firstName.trim().length > 0 &&
    displayName.trim().length > 0 &&
    phone.trim().length > 0 &&
    agreed;

  const handleFinish = async () => {
    if (!placeId) {
      setError('Missing building info. Please go back and pick your building.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Make sure we have an identity (anonymous, no verification yet).
      const { error: authError } = await ensureSignedIn();
      if (authError) {
        setError(authError);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Could not establish your account. Please try again.');
        return;
      }

      // 2. Save the profile (owner-only per RLS). Full name and phone go in a
      //    separate owner-only table so other residents can never read them;
      //    only display_name and avatar_url are shared-readable.
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        in_directory: inDirectory,
      });
      if (profileError) {
        setError(profileError.message);
        return;
      }

      const { error: contactError } = await supabase
        .from('private_contact')
        .upsert({
          id: user.id,
          full_name: [firstName.trim(), lastName.trim()]
            .filter(Boolean)
            .join(' '),
          phone: phone.trim(),
        });
      if (contactError) {
        setError(contactError.message);
        return;
      }

      // 3. Join the building through the trusted RPC (role/verified are
      //    controlled server-side; we never set them from here).
      const { error: joinError } = await supabase.rpc('join_building', {
        p_place_id: placeId,
        p_name: name ?? '',
        p_address: address ?? '',
        p_latitude: latitude ? Number(latitude) : null,
        p_longitude: longitude ? Number(longitude) : null,
      });
      if (joinError) {
        setError(joinError.message);
        return;
      }

      router.replace('/home');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.eyebrow}>Your profile</Text>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.description}>
          This is how neighbors at {name ?? 'your building'} will see you.
        </Text>

        <View style={styles.avatarSection}>
          <Pressable
            style={styles.avatarPicker}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color="#6D28D9" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlus}>+</Text>
            )}
          </Pressable>
          <Text style={styles.avatarHint}>
            {avatarUrl ? 'Change photo' : 'Add a photo (optional)'}
          </Text>
        </View>

        <View style={styles.nameRow}>
          <View style={styles.nameCol}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jane"
              placeholderTextColor="#9B8CAF"
              style={styles.input}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Resident"
              placeholderTextColor="#9B8CAF"
              style={styles.input}
              autoCapitalize="words"
            />
          </View>
        </View>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Jane"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="(555) 123-4567"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
          keyboardType="phone-pad"
          inputMode="tel"
        />
        <Text style={styles.hint}>Private. Only you can see this.</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Neighbor directory</Text>
            <Text style={styles.toggleSub}>
              List me so neighbors can find me. Shows your first name and photo
              only, never your last name or unit.
            </Text>
          </View>
          <Switch
            value={inDirectory}
            onValueChange={setInDirectory}
            trackColor={{ true: '#6D28D9', false: '#D8CEE9' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D8CEE9"
          />
        </View>

        <View style={styles.agreeRow}>
          <Pressable onPress={() => setAgreed((v) => !v)} hitSlop={8}>
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed ? (
                <Feather name="check" size={14} color="#FFFFFF" />
              ) : null}
            </View>
          </Pressable>
          <Text style={styles.agreeText}>
            I agree to Knock&apos;s{' '}
            <Text style={styles.link} onPress={() => router.push('/terms')}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={() => router.push('/privacy')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[
            styles.primaryButton,
            (!canSubmit || saving) && styles.primaryButtonDisabled,
          ]}
          disabled={!canSubmit || saving}
          onPress={handleFinish}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Finish</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          disabled={saving}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: '#F1ECFA',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  avatarPlus: {
    fontSize: 40,
    color: '#6D28D9',
    fontWeight: '300',
  },
  avatarHint: {
    fontSize: 14,
    color: '#76698C',
    fontWeight: '600',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1438',
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
  hint: {
    fontSize: 14,
    color: '#76698C',
    marginTop: -8,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    padding: 16,
    marginBottom: 20,
  },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameCol: { flex: 1 },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: '800', color: '#1F1438' },
  toggleSub: { fontSize: 13, color: '#76698C', marginTop: 3, lineHeight: 18 },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 20,
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C9BCE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  agreeText: { flex: 1, fontSize: 14, color: '#4A3D63', lineHeight: 21 },
  link: { color: '#6D28D9', fontWeight: '800' },
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
