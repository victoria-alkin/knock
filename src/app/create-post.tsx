import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { pickAndUploadPostPhoto } from '@/lib/avatar';
import { CHANNELS } from '@/constants/channels';
import { getMyBuilding } from '@/lib/membership';
import { createPost, PostUrgency } from '@/lib/posts';

const URGENCY_OPTIONS: { value: PostUrgency; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'this_week', label: 'This week' },
  { value: 'asap', label: 'ASAP' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ channel?: string }>();

  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState<string>('your building');
  const [channel, setChannel] = useState<string>(params.channel ?? 'general');
  const [body, setBody] = useState('');
  const [urgency, setUrgency] = useState<PostUrgency>('normal');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    setUploadingImage(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadPostPhoto();
    if (url) setImageUrl(url);
    else if (uploadError) setError(uploadError);
    setUploadingImage(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const building = await getMyBuilding();
      if (active && building) {
        setBuildingId(building.id);
        setBuildingName(building.name);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canPost =
    buildingId !== null &&
    (body.trim().length > 0 || imageUrl !== null) &&
    !posting;

  const handlePost = async () => {
    if (!buildingId) {
      setError('Could not find your building. Please try again.');
      return;
    }
    setPosting(true);
    setError(null);

    const { error: postError } = await createPost(
      buildingId,
      channel,
      body,
      imageUrl,
      urgency,
    );
    if (postError) {
      setError(postError);
      setPosting(false);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={posting}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New post</Text>
        <Pressable onPress={handlePost} disabled={!canPost}>
          <Text style={[styles.post, !canPost && styles.postDisabled]}>
            {posting ? '…' : 'Post'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Channel</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channelRow}
        >
          {CHANNELS.map((c) => {
            const selected = c.key === channel;
            return (
              <Pressable
                key={c.key}
                style={[styles.channelChip, selected && styles.channelChipOn]}
                onPress={() => setChannel(c.key)}
              >
                <Text style={styles.channelChipEmoji}>{c.emoji}</Text>
                <Text
                  style={[
                    styles.channelChipText,
                    selected && styles.channelChipTextOn,
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Your post</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={`Share something with ${buildingName}…`}
          placeholderTextColor="#9B8CAF"
          style={styles.input}
          multiline
          autoFocus
          maxLength={4000}
        />

        {imageUrl ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: imageUrl }} style={styles.photo} />
            <Pressable
              style={styles.removePhoto}
              onPress={() => setImageUrl(null)}
            >
              <Text style={styles.removePhotoText}>Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.addPhoto}
            onPress={handlePickPhoto}
            disabled={uploadingImage}
          >
            <Text style={styles.addPhotoText}>
              {uploadingImage ? 'Uploading…' : '📷  Add a photo'}
            </Text>
          </Pressable>
        )}

        <Text style={styles.urgencyLabel}>Urgency</Text>
        <View style={styles.urgencyRow}>
          {URGENCY_OPTIONS.map((option) => {
            const selected = option.value === urgency;
            return (
              <Pressable
                key={option.value}
                style={[styles.urgencyChip, selected && styles.urgencyChipOn]}
                onPress={() => setUrgency(option.value)}
              >
                <Text
                  style={[
                    styles.urgencyText,
                    selected && styles.urgencyTextOn,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2FF',
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
  post: {
    fontSize: 16,
    color: '#6D28D9',
    fontWeight: '800',
  },
  postDisabled: {
    color: '#B9A9D4',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1438',
    marginBottom: 10,
  },
  channelRow: {
    gap: 8,
    paddingBottom: 22,
    paddingRight: 8,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  channelChipOn: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  channelChipEmoji: {
    fontSize: 15,
  },
  channelChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A3D63',
  },
  channelChipTextOn: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    fontSize: 16,
    color: '#1F1438',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    minHeight: 160,
    textAlignVertical: 'top',
  },
  addPhoto: {
    backgroundColor: '#F1ECFA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addPhotoText: { fontSize: 15, color: '#6D28D9', fontWeight: '700' },
  photoWrap: { marginTop: 4 },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 10,
  },
  removePhoto: { alignSelf: 'flex-start' },
  removePhotoText: { fontSize: 14, color: '#B4243F', fontWeight: '700' },
  urgencyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1438',
    marginTop: 22,
    marginBottom: 10,
  },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    paddingVertical: 10,
    alignItems: 'center',
  },
  urgencyChipOn: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  urgencyText: { fontSize: 14, fontWeight: '800', color: '#4A3D63' },
  urgencyTextOn: { color: '#FFFFFF' },
  errorText: {
    fontSize: 15,
    color: '#B4243F',
    marginTop: 16,
  },
});
