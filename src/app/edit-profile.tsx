import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { getMyProfile, updateProfile } from '@/lib/membership';

export default function EditProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const profile = await getMyProfile();
      if (active) {
        setFullName(profile?.full_name ?? '');
        setDisplayName(profile?.display_name ?? '');
        setPhone(profile?.phone ?? '');
        setAvatarUrl(profile?.avatar_url ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handlePickAvatar = async () => {
    setUploadingAvatar(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadAvatar();
    if (url) setAvatarUrl(url);
    else if (uploadError) setError(uploadError);
    setUploadingAvatar(false);
  };

  const canSave =
    fullName.trim().length > 0 &&
    displayName.trim().length > 0 &&
    phone.trim().length > 0 &&
    !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error: saveError } = await updateProfile({
      full_name: fullName,
      display_name: displayName,
      phone,
      avatar_url: avatarUrl,
    });
    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <Pressable onPress={handleSave} disabled={!canSave}>
          <Text style={[styles.save, !canSave && styles.saveDisabled]}>
            {saving ? '…' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
            {avatarUrl ? 'Change photo' : 'Add a photo'}
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

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7DFF5',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1438',
  },
  cancel: {
    fontSize: 16,
    color: '#6D28D9',
    fontWeight: '600',
  },
  save: {
    fontSize: 16,
    color: '#6D28D9',
    fontWeight: '800',
  },
  saveDisabled: {
    color: '#B9A9D4',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
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
  avatarImage: { width: 96, height: 96 },
  avatarPlus: { fontSize: 40, color: '#6D28D9', fontWeight: '300' },
  avatarHint: { fontSize: 14, color: '#76698C', fontWeight: '600' },
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
  errorText: {
    fontSize: 15,
    color: '#B4243F',
    marginTop: 8,
  },
});
