import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
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

import { DateTimeField } from '@/components/date-time-field';
import { Icon } from '@/components/icon';
import { CHANNELS } from '@/constants/channels';
import { postIcons } from '@/constants/icons';
import { pickAndUploadEventPhoto, pickAndUploadPostPhoto } from '@/lib/avatar';
import { createEvent } from '@/lib/events';
import { getMyBuilding } from '@/lib/membership';
import { createPost, PostUrgency } from '@/lib/posts';

const URGENCY_OPTIONS: { value: PostUrgency; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'this_week', label: 'This week' },
  { value: 'asap', label: 'ASAP' },
];

const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Never', days: null },
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

function defaultDate() {
  return new Date();
}
function defaultTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ channel?: string }>();

  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState<string>('your building');
  const [channel, setChannel] = useState<string>(params.channel ?? 'general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post fields
  const [body, setBody] = useState('');
  const [urgency, setUrgency] = useState<PostUrgency>('normal');
  const [allowReplies, setAllowReplies] = useState(true);
  const [allowDms, setAllowDms] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Event fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [datePart, setDatePart] = useState<Date>(defaultDate);
  const [timePart, setTimePart] = useState<Date>(defaultTime);
  const [capacity, setCapacity] = useState('');
  const [rsvpRequired, setRsvpRequired] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const isEvent = channel === 'events';

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

  const handlePickPhoto = async () => {
    setUploadingImage(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadPostPhoto();
    if (url) setImageUrl(url);
    else if (uploadError) setError(uploadError);
    setUploadingImage(false);
  };

  const handlePickCover = async () => {
    setUploadingCover(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadEventPhoto();
    if (url) setCoverUrl(url);
    else if (uploadError) setError(uploadError);
    setUploadingCover(false);
  };

  const handlePost = async () => {
    if (!buildingId) {
      setError('Could not find your building. Please try again.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 86400000).toISOString()
      : null;

    const { error: postError } = await createPost({
      buildingId,
      channel,
      body,
      imageUrl,
      urgency,
      allowReplies,
      allowDms,
      isAnonymous,
      expiresAt,
    });
    if (postError) {
      setError(postError);
      setSubmitting(false);
      return;
    }
    router.back();
  };

  const handleCreateEvent = async () => {
    if (!buildingId) {
      setError('Could not find your building. Please try again.');
      return;
    }
    const startsAt = new Date(
      datePart.getFullYear(),
      datePart.getMonth(),
      datePart.getDate(),
      timePart.getHours(),
      timePart.getMinutes(),
    ).toISOString();

    let capacityValue: number | null = null;
    if (capacity.trim().length > 0) {
      const parsed = Number(capacity.trim());
      if (!Number.isInteger(parsed) || parsed <= 0) {
        setError('Capacity must be a whole number, or leave it blank.');
        return;
      }
      capacityValue = parsed;
    }

    setSubmitting(true);
    setError(null);
    const { error: createError, id } = await createEvent({
      buildingId,
      title,
      description,
      location,
      startsAt,
      imageUrl: coverUrl,
      capacity: capacityValue,
      rsvpRequired,
      allowComments,
    });
    if (createError || !id) {
      setError(createError ?? 'Could not create the event.');
      setSubmitting(false);
      return;
    }
    router.replace({ pathname: '/event/[eventId]', params: { eventId: id } });
  };

  const canSubmit = isEvent
    ? buildingId !== null && title.trim().length > 0 && !submitting
    : buildingId !== null &&
      (body.trim().length > 0 || imageUrl !== null) &&
      !submitting;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} disabled={submitting}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEvent ? 'New event' : 'New post'}
        </Text>
        <Pressable
          onPress={isEvent ? handleCreateEvent : handlePost}
          disabled={!canSubmit}
        >
          <Text style={[styles.post, !canSubmit && styles.postDisabled]}>
            {submitting ? '…' : isEvent ? 'Create' : 'Post'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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

        {isEvent ? (
          <EventForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            location={location}
            setLocation={setLocation}
            datePart={datePart}
            setDatePart={setDatePart}
            timePart={timePart}
            setTimePart={setTimePart}
            capacity={capacity}
            setCapacity={setCapacity}
            rsvpRequired={rsvpRequired}
            setRsvpRequired={setRsvpRequired}
            allowComments={allowComments}
            setAllowComments={setAllowComments}
            coverUrl={coverUrl}
            uploadingCover={uploadingCover}
            onPickCover={handlePickCover}
          />
        ) : (
          <>
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
                <Icon source={postIcons.photo} size={20} color="#6D28D9" />
                <Text style={styles.addPhotoText}>
                  {uploadingImage ? 'Uploading…' : 'Add a photo'}
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

            <View style={styles.optionRow}>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Allow replies</Text>
                <Text style={styles.optionSub}>
                  Anyone in the building can reply
                </Text>
              </View>
              <Switch
                value={allowReplies}
                onValueChange={setAllowReplies}
                trackColor={{ true: '#6D28D9', false: '#D8CEE9' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D8CEE9"
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Allow direct messages</Text>
                <Text style={styles.optionSub}>
                  People can message you about this
                </Text>
              </View>
              <Switch
                value={allowDms}
                onValueChange={setAllowDms}
                trackColor={{ true: '#6D28D9', false: '#D8CEE9' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D8CEE9"
              />
            </View>

            <View style={styles.optionRow}>
              <Icon source={postIcons.anonymous} size={22} color="#6D28D9" />
              <View style={[styles.optionText, styles.optionTextWithIcon]}>
                <Text style={styles.optionTitle}>Post anonymously</Text>
                <Text style={styles.optionSub}>Your name won&apos;t be shown</Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ true: '#6D28D9', false: '#D8CEE9' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D8CEE9"
              />
            </View>

            <Text style={styles.urgencyLabel}>Expires</Text>
            <View style={styles.urgencyRow}>
              {EXPIRY_OPTIONS.map((option) => {
                const selected = option.days === expiryDays;
                return (
                  <Pressable
                    key={option.label}
                    style={[styles.urgencyChip, selected && styles.urgencyChipOn]}
                    onPress={() => setExpiryDays(option.days)}
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
          </>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

type EventFormProps = {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  datePart: Date;
  setDatePart: (d: Date) => void;
  timePart: Date;
  setTimePart: (d: Date) => void;
  capacity: string;
  setCapacity: (v: string) => void;
  rsvpRequired: boolean;
  setRsvpRequired: (v: boolean) => void;
  allowComments: boolean;
  setAllowComments: (v: boolean) => void;
  coverUrl: string | null;
  uploadingCover: boolean;
  onPickCover: () => void;
};

function EventForm(props: EventFormProps) {
  return (
    <>
      <Pressable
        style={styles.coverPicker}
        onPress={props.onPickCover}
        disabled={props.uploadingCover}
      >
        {props.coverUrl ? (
          <Image source={{ uri: props.coverUrl }} style={styles.cover} />
        ) : (
          <Text style={styles.coverHint}>
            {props.uploadingCover ? 'Uploading…' : '📷  Add a cover photo'}
          </Text>
        )}
      </Pressable>

      <Text style={styles.label}>Event title</Text>
      <TextInput
        value={props.title}
        onChangeText={props.setTitle}
        placeholder="Rooftop hangout"
        placeholderTextColor="#9B8CAF"
        style={styles.evInput}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={props.description}
        onChangeText={props.setDescription}
        placeholder="What's the plan?"
        placeholderTextColor="#9B8CAF"
        style={[styles.evInput, styles.evMultiline]}
        multiline
      />

      <Text style={styles.label}>Date</Text>
      <DateTimeField mode="date" value={props.datePart} onChange={props.setDatePart} />

      <Text style={styles.label}>Time</Text>
      <DateTimeField mode="time" value={props.timePart} onChange={props.setTimePart} />

      <Text style={styles.label}>Location</Text>
      <TextInput
        value={props.location}
        onChangeText={props.setLocation}
        placeholder="Rooftop terrace"
        placeholderTextColor="#9B8CAF"
        style={styles.evInput}
      />

      <Text style={styles.sectionLabel}>Settings</Text>

      <Text style={styles.label}>Capacity</Text>
      <TextInput
        value={props.capacity}
        onChangeText={props.setCapacity}
        placeholder="Leave blank for unlimited"
        placeholderTextColor="#9B8CAF"
        style={styles.evInput}
        keyboardType="number-pad"
        inputMode="numeric"
      />

      <View style={styles.optionRow}>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>RSVP required</Text>
          <Text style={styles.optionSub}>People must RSVP to attend</Text>
        </View>
        <Switch
          value={props.rsvpRequired}
          onValueChange={props.setRsvpRequired}
          trackColor={{ true: '#6D28D9', false: '#D8CEE9' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D8CEE9"
        />
      </View>

      <View style={styles.optionRow}>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Allow comments</Text>
          <Text style={styles.optionSub}>
            People can comment and ask questions
          </Text>
        </View>
        <Switch
          value={props.allowComments}
          onValueChange={props.setAllowComments}
          trackColor={{ true: '#6D28D9', false: '#D8CEE9' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D8CEE9"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  evInput: {
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
  evMultiline: { minHeight: 90, textAlignVertical: 'top' },
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
  sectionLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1438',
    marginTop: 8,
    marginBottom: 14,
  },
  addPhoto: {
    backgroundColor: '#F1ECFA',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE8F8',
    marginTop: 8,
  },
  optionText: { flex: 1, paddingRight: 12 },
  optionTextWithIcon: { marginLeft: 12 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#1F1438' },
  optionSub: { fontSize: 13, color: '#76698C', marginTop: 2 },
  errorText: {
    fontSize: 15,
    color: '#B4243F',
    marginTop: 16,
  },
});
