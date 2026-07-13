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

import { pickAndUploadListingPhoto } from '@/lib/avatar';
import { createListing, KIND_LABEL, ListingKind } from '@/lib/marketplace';
import { getMyBuilding } from '@/lib/membership';

const KINDS: ListingKind[] = ['for_sale', 'giving_away', 'looking_for'];

export default function CreateListingScreen() {
  const router = useRouter();

  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ListingKind>('for_sale');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    setUploadingImage(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadListingPhoto();
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

  const handleCreate = async () => {
    if (!buildingId) {
      setError('Could not find your building. Please try again.');
      return;
    }

    let priceCents: number | null = null;
    if (kind === 'for_sale' && price.trim().length > 0) {
      const dollars = Number(price.trim());
      if (Number.isNaN(dollars) || dollars < 0) {
        setError('Please enter a valid price.');
        return;
      }
      priceCents = Math.round(dollars * 100);
    }

    setSaving(true);
    setError(null);
    const { error: createError, id } = await createListing({
      buildingId,
      kind,
      title,
      description,
      priceCents,
      imageUrl,
    });
    if (createError || !id) {
      setError(createError ?? 'Could not create the listing.');
      setSaving(false);
      return;
    }
    router.replace({
      pathname: '/listing/[listingId]',
      params: { listingId: id },
    });
  };

  const canCreate = title.trim().length > 0 && !saving;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New listing</Text>
        <Pressable onPress={handleCreate} disabled={!canCreate}>
          <Text style={[styles.post, !canCreate && styles.postDisabled]}>
            {saving ? '…' : 'Post'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Type</Text>
        <View style={styles.kindRow}>
          {KINDS.map((k) => {
            const selected = k === kind;
            return (
              <Pressable
                key={k}
                style={[styles.kindChip, selected && styles.kindChipOn]}
                onPress={() => setKind(k)}
              >
                <Text
                  style={[styles.kindText, selected && styles.kindTextOn]}
                >
                  {KIND_LABEL[k]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Photo</Text>
        <Pressable
          style={styles.photoPicker}
          onPress={handlePickPhoto}
          disabled={uploadingImage}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photo} />
          ) : (
            <Text style={styles.photoHint}>
              {uploadingImage ? 'Uploading…' : '+ Add a photo'}
            </Text>
          )}
        </Pressable>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Desk, TV, couch…"
          placeholderTextColor="#9B8CAF"
          style={styles.input}
        />

        {kind === 'for_sale' ? (
          <>
            <Text style={styles.label}>Price (USD)</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="25"
              placeholderTextColor="#9B8CAF"
              style={styles.input}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </>
        ) : null}

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Condition, pickup details, etc."
          placeholderTextColor="#9B8CAF"
          style={[styles.input, styles.multiline]}
          multiline
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
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
    marginBottom: 10,
  },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  kindChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    paddingVertical: 10,
    alignItems: 'center',
  },
  kindChipOn: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  kindText: { fontSize: 13, fontWeight: '800', color: '#4A3D63' },
  kindTextOn: { color: '#FFFFFF' },
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
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  photoPicker: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F1ECFA',
    borderWidth: 1,
    borderColor: '#E5DDF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
  },
  photo: { width: '100%', height: '100%' },
  photoHint: { fontSize: 15, color: '#6D28D9', fontWeight: '700' },
  errorText: { fontSize: 15, color: '#B4243F', marginTop: 4 },
});
