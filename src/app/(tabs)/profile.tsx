import { Feather } from '@expo/vector-icons';
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
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { useUnreadNotifications } from '@/hooks/use-unread-notifications';
import { pickAndUploadAvatar } from '@/lib/avatar';
import {
  getMyBuilding,
  getMyProfile,
  MyBuilding,
  MyProfile,
  signOut,
  updateAvatar,
} from '@/lib/membership';

type MenuItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
};

export default function ProfileScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop();
  const onScroll = useTabBarScroll();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [building, setBuilding] = useState<MyBuilding | null>(null);
  const unread = useUnreadNotifications();
  const [loading, setLoading] = useState(true);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [p, b] = await Promise.all([getMyProfile(), getMyBuilding()]);
        if (active) {
          setProfile(p);
          setBuilding(b);
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

  const handleChangePhoto = async () => {
    setPhotoMenu(false);
    setUploadingAvatar(true);
    setNotice(null);
    const { url, error: uploadError } = await pickAndUploadAvatar();
    if (url) {
      const { error: saveError } = await updateAvatar(url);
      if (saveError) setNotice(saveError);
      else setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    } else if (uploadError) {
      setNotice(uploadError);
    }
    setUploadingAvatar(false);
  };

  const handleRemovePhoto = async () => {
    setPhotoMenu(false);
    setUploadingAvatar(true);
    const { error: saveError } = await updateAvatar(null);
    if (saveError) setNotice(saveError);
    else setProfile((p) => (p ? { ...p, avatar_url: null } : p));
    setUploadingAvatar(false);
  };

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
    {
      icon: 'file-text',
      label: 'My Posts',
      onPress: () => router.push('/my-posts'),
    },
    {
      icon: 'calendar',
      label: 'My Events',
      onPress: () => router.push('/my-events'),
    },
    {
      icon: 'edit-3',
      label: 'Edit Profile',
      onPress: () => router.push('/edit-profile'),
    },
    {
      icon: 'users',
      label: 'Neighbor Directory',
      onPress: () => router.push('/neighbor-directory'),
    },
    {
      icon: 'slash',
      label: 'Blocked Users',
      onPress: () => router.push('/blocked-users'),
    },
    {
      icon: 'help-circle',
      label: 'Help & Support',
      onPress: () => router.push('/help-support'),
    },
    {
      icon: 'settings',
      label: 'Settings',
      onPress: () => router.push('/settings'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
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
          <Pressable
            onPress={() => setPhotoMenu(true)}
            hitSlop={8}
            style={styles.avatarWrap}
          >
            <Avatar
              name={profile?.display_name ?? '?'}
              url={profile?.avatar_url}
              size={56}
            />
            {uploadingAvatar ? (
              <View style={styles.avatarBadge}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            ) : null}
          </Pressable>
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
              <Feather
                name={item.icon}
                size={20}
                color="#4A3D63"
                style={styles.menuIcon}
              />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={20} color="#B9A9D4" />
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
            <Feather name="log-out" size={18} color="#E23E57" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        )}
      </ScrollView>

      {photoMenu ? (
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPhotoMenu(false)}
          />
          <View style={styles.dialog}>
            <Text style={styles.sheetTitle}>Profile Photo</Text>
            <Pressable style={styles.sheetPrimary} onPress={handleChangePhoto}>
              <Feather name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.sheetPrimaryText}>
                {profile?.avatar_url ? 'Change Photo' : 'Add Photo'}
              </Text>
            </Pressable>
            {profile?.avatar_url ? (
              <Pressable style={styles.sheetRemove} onPress={handleRemovePhoto}>
                <Text style={styles.sheetRemoveText}>Remove Photo</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.sheetCancel}
              onPress={() => setPhotoMenu(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 130 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Cards sit at a 16px inset, but match the home header's 20px button inset.
    marginHorizontal: 4,
    marginBottom: 18,
  },
  logo: { width: 130, height: 48 },
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
    fontSize: 22,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 14,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#6D28D9',
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 18,
    // Extra purple below the content for the menu card to overlap into.
    paddingBottom: 56,
    marginBottom: 0,
  },
  avatarWrap: { position: 'relative' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#4A1F9E',
    borderWidth: 2,
    borderColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  profileName: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  profileHandle: {
    fontSize: 14,
    color: '#E4D9FB',
    marginTop: 2,
    marginBottom: 10,
  },
  buildingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buildingBadgeText: { fontSize: 13, fontWeight: '700', color: '#6D28D9' },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    // Narrower than the purple card so it sits inset within it.
    marginHorizontal: 14,
    // Pull the card up so it overlaps the bottom of the purple card,
    // with a soft shadow so it reads as a layer on top.
    marginTop: -34,
    zIndex: 1,
    shadowColor: '#1F1438',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#F0EBF9' },
  menuIcon: { width: 34 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2A1F42' },
  notice: {
    fontSize: 14,
    color: '#6D28D9',
    textAlign: 'center',
    marginTop: 16,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '800', color: '#E23E57' },
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 20, 56, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1438',
    textAlign: 'center',
    marginBottom: 16,
  },
  sheetPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 15,
  },
  sheetPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sheetRemove: { paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  sheetRemoveText: { color: '#E23E57', fontSize: 16, fontWeight: '700' },
  sheetCancel: { paddingVertical: 13, alignItems: 'center', marginTop: 2 },
  sheetCancelText: { color: '#6D28D9', fontSize: 15, fontWeight: '700' },
});
