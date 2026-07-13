import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pickAndUploadAvatar } from '@/lib/avatar';
import { supabase } from '@/lib/supabase';

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

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickAvatar = async () => {
    setUploadingAvatar(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadAvatar();
    if (url) setAvatarUrl(url);
    else if (uploadError) setError(uploadError);
    setUploadingAvatar(false);
  };

  const canSubmit =
    fullName.trim().length > 0 &&
    displayName.trim().length > 0 &&
    phone.trim().length > 0;

  const handleFinish = async () => {
    if (!placeId) {
      setError('Missing building info. Please go back and pick your building.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Make sure we have an identity (anonymous — no verification yet).
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const { error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          setError(`Could not start a session: ${authError.message}`);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Could not establish your account. Please try again.');
        return;
      }

      // 2. Save the profile (owner-only per RLS). Phone goes in a separate
      //    owner-only table so other residents can never read it.
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim(),
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      });
      if (profileError) {
        setError(profileError.message);
        return;
      }

      const { error: contactError } = await supabase
        .from('private_contact')
        .upsert({ id: user.id, phone: phone.trim() });
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

        <Text style={styles.label}>Full name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Jane Resident"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
          autoCapitalize="words"
        />

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
        <Text style={styles.hint}>Private — only you can see this.</Text>

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
