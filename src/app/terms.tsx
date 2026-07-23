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

export default function TermsScreen() {
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
        <Text style={styles.pageTitle}>Terms of Service</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: {EFFECTIVE_DATE}</Text>

        <Text style={styles.p}>
          Welcome to Knock, a private, building-specific community app for
          apartment residents. By creating an account or using Knock, you agree
          to these Terms of Service. If you do not agree, please do not use
          Knock.
        </Text>

        <Text style={styles.h}>Eligibility</Text>
        <Text style={styles.p}>
          You must be at least 13 years old to use Knock. You may only join a
          building where you actually live.
        </Text>

        <Text style={styles.h}>Your account</Text>
        <Text style={styles.p}>
          You are responsible for the activity on your account and for keeping
          your building and profile information accurate. Do not impersonate
          others or misrepresent who you are.
        </Text>

        <Text style={styles.h}>Community rules and zero tolerance</Text>
        <Text style={styles.p}>
          Knock has zero tolerance for objectionable content and abusive
          behavior. You agree not to post, send, or share content that is:
        </Text>
        <Text style={styles.li}>
          • Harassing, bullying, threatening, or hateful toward any person or
          group;
        </Text>
        <Text style={styles.li}>
          • Sexually explicit, obscene, or otherwise inappropriate;
        </Text>
        <Text style={styles.li}>
          • Illegal, or that promotes illegal or dangerous activity;
        </Text>
        <Text style={styles.li}>
          • Spam, scams, or fraudulent or deceptive content;
        </Text>
        <Text style={styles.li}>
          • Infringing on someone else&apos;s rights, or that shares another
          resident&apos;s private information without consent.
        </Text>
        <Text style={styles.p}>
          Content and users that violate these rules are not welcome on Knock and
          may be removed without notice.
        </Text>

        <Text style={styles.h}>Reporting, blocking, and moderation</Text>
        <Text style={styles.p}>
          You can report content or users and block other residents from within
          the app. We review reports and may remove content or suspend or
          terminate accounts that violate these Terms, at our discretion. We aim
          to act on valid reports promptly.
        </Text>

        <Text style={styles.h}>Your content</Text>
        <Text style={styles.p}>
          You keep ownership of the content you create. By posting, you grant
          Knock a license to store and display that content to the members of
          your building so the app can function. You are responsible for the
          content you post.
        </Text>

        <Text style={styles.h}>Marketplace and events</Text>
        <Text style={styles.p}>
          Marketplace listings, events, and any resulting transactions or
          gatherings are solely between residents. Knock is not a party to them,
          does not verify items or people, and is not responsible for any
          transaction, meeting, or dispute between residents.
        </Text>

        <Text style={styles.h}>Disclaimers</Text>
        <Text style={styles.p}>
          Knock is provided &quot;as is&quot; without warranties of any kind. To
          the fullest extent permitted by law, Knock and its operators are not
          liable for any indirect, incidental, or consequential damages arising
          from your use of the app or interactions with other residents.
        </Text>

        <Text style={styles.h}>Termination</Text>
        <Text style={styles.p}>
          You may delete your account at any time from Settings, then Delete
          Account. We may suspend or terminate accounts that violate these Terms
          or that put the community at risk.
        </Text>

        <Text style={styles.h}>Changes to these Terms</Text>
        <Text style={styles.p}>
          We may update these Terms from time to time. If we make material
          changes, we will update the date above and, where appropriate, notify
          you in the app. Continuing to use Knock after changes take effect means
          you accept the updated Terms.
        </Text>

        <Text style={styles.h}>Contact us</Text>
        <Text style={styles.p}>
          Questions about these Terms? Contact us at {SUPPORT_EMAIL}.
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
