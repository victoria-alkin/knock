import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pickAndUploadEventPhoto } from '@/lib/avatar';
import { createEvent } from '@/lib/events';
import { getMyBuilding } from '@/lib/membership';

export default function CreateEventScreen() {
  const router = useRouter();

  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState(''); // HH:MM
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    setUploadingImage(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadEventPhoto();
    if (url) setImageUrl(url);
    else if (uploadError) setError(uploadError);
    setUploadingImage(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const building = await getMyBuilding();
      if (active) setBuildingId(building?.id ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  const parseStartsAt = (): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
    if (!/^\d{1,2}:\d{2}$/.test(time.trim())) return null;
    const combined = new Date(`${date.trim()}T${time.trim()}`);
    if (Number.isNaN(combined.getTime())) return null;
    return combined.toISOString();
  };

  const handleCreate = async () => {
    if (!buildingId) {
      setError('Could not find your building. Please try again.');
      return;
    }
    const startsAt = parseStartsAt();
    if (!startsAt) {
      setError('Please enter a valid date (YYYY-MM-DD) and time (HH:MM).');
      return;
    }

    setSaving(true);
    setError(null);
    const { error: createError, id } = await createEvent({
      buildingId,
      title,
      description,
      location,
      startsAt,
      imageUrl,
    });
    if (createError || !id) {
      setError(createError ?? 'Could not create the event.');
      setSaving(false);
      return;
    }
    router.replace({ pathname: '/event/[eventId]', params: { eventId: id } });
  };

  const canCreate = title.trim().length > 0 && !saving;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Create event</Text>
        <Pressable onPress={handleCreate} disabled={!canCreate}>
          <Text style={[styles.post, !canCreate && styles.postDisabled]}>
            {saving ? '…' : 'Create'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.coverPicker}
          onPress={handlePickPhoto}
          disabled={uploadingImage}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cover} />
          ) : (
            <Text style={styles.coverHint}>
              {uploadingImage ? 'Uploading…' : '📷  Add a cover photo'}
            </Text>
          )}
        </Pressable>

        <Text style={styles.label}>Event title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Rooftop hangout"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What's the plan?"
          placeholderTextColor="#9B8CAF"
          style={[styles.input, styles.multiline]}
          multiline
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-08-01"
              placeholderTextColor="#9B8CAF"
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Time</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="19:00"
              placeholderTextColor="#9B8CAF"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Location</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Rooftop terrace"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7DFF5',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1F1438' },
  cancel: { fontSize: 16, color: '#6D28D9', fontWeight: '600' },
  post: { fontSize: 16, color: '#6D28D9', fontWeight: '800' },
  postDisabled: { color: '#B9A9D4' },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1438',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F1438',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    marginBottom: 18,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  coverPicker: {
    height: 170,
    borderRadius: 16,
    backgroundColor: '#F1ECFA',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  cover: { width: '100%', height: '100%' },
  coverHint: { fontSize: 15, color: '#6D28D9', fontWeight: '700' },
  errorText: { fontSize: 15, color: '#B4243F', marginTop: 4 },
});
