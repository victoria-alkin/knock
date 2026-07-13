import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { topBarIcons } from '@/constants/icons';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import {
  getMyBuilding,
  getMyProfile,
  MyBuilding,
  MyProfile,
  signOut,
} from '@/lib/membership';
import { getUnreadCount } from '@/lib/notifications';

type MenuItem = {
  icon: string;
  label: string;
  onPress: () => void;
};

export default function ProfileScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [building, setBuilding] = useState<MyBuilding | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [p, b, n] = await Promise.all([
          getMyProfile(),
          getMyBuilding(),
          getUnreadCount(),
        ]);
        if (active) {
          setProfile(p);
          setBuilding(b);
          setUnread(n);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const comingSoon = (label: string) => setNotice(`${label} is coming soon.`);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#6D28D9" />
      </SafeAreaView>
    );
  }

  const fullName = profile?.full_name ?? profile?.display_name ?? 'You';
  const handle = (profile?.display_name ?? profile?.full_name ?? 'you')
    .replace(/\s+/g, '')
    .toLowerCase();

  const menu: MenuItem[] = [
    { icon: '📝', label: 'My Posts', onPress: () => comingSoon('My Posts') },
    { icon: '📅', label: 'My Events', onPress: () => comingSoon('My Events') },
    {
      icon: '✏️',
      label: 'Edit Profile',
      onPress: () => router.push('/edit-profile'),
    },
    {
      icon: '👥',
      label: 'Neighbor Directory',
      onPress: () => comingSoon('The neighbor directory'),
    },
    {
      icon: '💬',
      label: 'Help & Support',
      onPress: () => comingSoon('Help & Support'),
    },
    { icon: '⚙️', label: 'Settings', onPress: () => comingSoon('Settings') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/invite')} hitSlop={12}>
            <Icon source={topBarIcons.addUser} size={24} color="#6D28D9" />
          </Pressable>
          <Image
            source={require('@/assets/images/knock-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={12}
            style={styles.bellWrap}
          >
            <Icon source={topBarIcons.notification} size={24} color="#6D28D9" />
            {unread > 0 ? <View style={styles.bellBadge} /> : null}
          </Pressable>
        </View>

        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <Avatar
            name={profile?.display_name ?? '?'}
            url={profile?.avatar_url}
            size={64}
          />
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileHandle}>@{handle}</Text>
            <View style={styles.buildingBadge}>
              <Text style={styles.buildingBadgeText}>
                🏢 {building?.name ?? 'Your building'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menu.map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, i < menu.length - 1 && styles.menuDivider]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {confirmingSignOut ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              Log out? Because your account isn&apos;t linked to a phone or
              email yet, you&apos;ll need to set up again on this device.
            </Text>
            <Pressable style={styles.logoutConfirm} onPress={handleSignOut}>
              <Text style={styles.logoutConfirmText}>Yes, log out</Text>
            </Pressable>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setConfirmingSignOut(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.logoutRow}
            onPress={() => setConfirmingSignOut(true)}
          >
            <Text style={styles.logoutText}>⎋ Log Out</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  logo: { width: 120, height: 44 },
  bellWrap: { width: 24, height: 24 },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E23E57',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1F1438',
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#6D28D9',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
  },
  profileText: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  profileHandle: {
    fontSize: 15,
    color: '#E4D9FB',
    marginTop: 2,
    marginBottom: 12,
  },
  buildingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buildingBadgeText: { fontSize: 13, fontWeight: '800', color: '#6D28D9' },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#F0EBF9' },
  menuIcon: { fontSize: 18, width: 30 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1F1438' },
  chevron: { fontSize: 24, color: '#B9A9D4' },
  notice: {
    fontSize: 14,
    color: '#6D28D9',
    textAlign: 'center',
    marginTop: 16,
  },
  logoutRow: { alignItems: 'center', paddingVertical: 20, marginTop: 8 },
  logoutText: { fontSize: 16, fontWeight: '800', color: '#B4243F' },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0D6DC',
    padding: 18,
    marginTop: 20,
  },
  confirmText: {
    fontSize: 15,
    color: '#67597F',
    lineHeight: 22,
    marginBottom: 16,
  },
  logoutConfirm: {
    backgroundColor: '#B4243F',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  cancelButton: { paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#6D28D9', fontSize: 15, fontWeight: '700' },
});
