import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'knock.app.support@gmail.com';
const EFFECTIVE_DATE = 'July 23, 2026';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerSide}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.pageTitle}>Privacy Policy</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: {EFFECTIVE_DATE}</Text>

        <Text style={styles.p}>
          Knock is a private, building-specific community app for apartment
          residents. This policy explains what information Knock collects, how we
          use it, and the choices you have. By using Knock you agree to this
          policy.
        </Text>

        <Text style={styles.h}>Information you provide</Text>
        <Text style={styles.p}>
          When you set up your account you may provide your first and last name,
          a display name, a phone number, and a profile photo. You also choose
          the building you live in. As you use Knock you create content such as
          posts, comments, events, RSVPs, marketplace listings, direct messages,
          and reports. Your account itself is created anonymously; we do not
          require an email address to use the app.
        </Text>

        <Text style={styles.h}>What other residents can see</Text>
        <Text style={styles.p}>
          Only your display name and profile photo are shown to other members of
          your building, alongside the posts, comments, events, and listings you
          create. Your full name (first and last) and your phone number are kept
          private and are never shown to other residents. Direct messages are
          visible only to you and the person you are messaging. The neighbor
          directory is opt-in: you appear in it only if you choose to.
        </Text>

        <Text style={styles.h}>Location</Text>
        <Text style={styles.p}>
          If you choose to verify that you live in your building, Knock uses your
          device location at that moment to check you are near the building. Knock
          does not track your location in the background or store a location
          history.
        </Text>

        <Text style={styles.h}>Photos</Text>
        <Text style={styles.p}>
          If you add a profile picture or a photo to a post, event, or listing,
          Knock accesses the photo you select from your device. We only use the
          images you explicitly choose.
        </Text>

        <Text style={styles.h}>Notifications</Text>
        <Text style={styles.p}>
          If you enable push notifications, we store a device notification token
          so we can send you alerts about messages, replies, RSVPs, and event
          reminders. You can turn notifications off at any time in your device
          settings.
        </Text>

        <Text style={styles.h}>How we use your information</Text>
        <Text style={styles.p}>
          We use your information to operate Knock: to run your building&apos;s
          community feed, deliver your messages and notifications, show the
          opt-in directory, keep the service safe (including handling reports and
          blocks), and respond to support requests. We do not sell your personal
          information, and Knock does not show ads.
        </Text>

        <Text style={styles.h}>Service providers</Text>
        <Text style={styles.p}>
          We rely on a small number of providers to run Knock, and share only
          what is needed for each to do its job:
        </Text>
        <Text style={styles.li}>
          • Supabase hosts our database, authentication, and file storage, where
          your account and content are stored.
        </Text>
        <Text style={styles.li}>
          • Vercel hosts the app&apos;s web and server components.
        </Text>
        <Text style={styles.li}>
          • Google Places is used to search for your building by name or address;
          your search text is sent to Google to return matches.
        </Text>
        <Text style={styles.li}>
          • Expo and the Apple and Google push services deliver notifications to
          your device.
        </Text>
        <Text style={styles.p}>
          These providers process data on our behalf and are expected to protect
          it consistent with this policy.
        </Text>

        <Text style={styles.h}>Data retention and deletion</Text>
        <Text style={styles.p}>
          We keep your information for as long as your account is active. You can
          permanently delete your account at any time from Settings, then Delete
          Account. Deleting your account removes your profile, posts, comments,
          events, listings, RSVPs, messages, and other data associated with you.
          This cannot be undone.
        </Text>

        <Text style={styles.h}>Security</Text>
        <Text style={styles.p}>
          Data is encrypted in transit. Access to your data is restricted by
          row-level security rules so that residents only see what they are meant
          to, and private fields such as your full name and phone number are
          readable only by you. No system is perfectly secure, but we work to
          protect your information.
        </Text>

        <Text style={styles.h}>Children</Text>
        <Text style={styles.p}>
          Knock is not directed to children under 13, and we do not knowingly
          collect information from children under 13.
        </Text>

        <Text style={styles.h}>Changes to this policy</Text>
        <Text style={styles.p}>
          We may update this policy from time to time. If we make material
          changes, we will update the date above and, where appropriate, notify
          you in the app.
        </Text>

        <Text style={styles.h}>Contact us</Text>
        <Text style={styles.p}>
          If you have questions about this policy or your data, contact us at{' '}
          {SUPPORT_EMAIL}.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerSide: { width: 60 },
  back: { fontSize: 16, color: '#6D28D9', fontWeight: '700' },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#1F1438',
  },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  updated: { fontSize: 13, color: '#8A7BA3', marginBottom: 18 },
  h: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1438',
    marginTop: 22,
    marginBottom: 8,
  },
  p: { fontSize: 15, color: '#4A3D63', lineHeight: 23 },
  li: { fontSize: 15, color: '#4A3D63', lineHeight: 23, marginTop: 6 },
});
