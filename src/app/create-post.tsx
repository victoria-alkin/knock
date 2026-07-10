import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHANNELS } from '@/constants/channels';
import { getMyBuilding } from '@/lib/membership';
import { createPost } from '@/lib/posts';

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ channel?: string }>();

  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState<string>('your building');
  const [channel, setChannel] = useState<string>(params.channel ?? 'general');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canPost = buildingId !== null && body.trim().length > 0 && !posting;

  const handlePost = async () => {
    if (!buildingId) {
      setError('Could not find your building. Please try again.');
      return;
    }
    setPosting(true);
    setError(null);

    const { error: postError } = await createPost(buildingId, channel, body);
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
  errorText: {
    fontSize: 15,
    color: '#B4243F',
    marginTop: 16,
  },
});
