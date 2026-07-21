import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { CHANNELS } from '@/constants/channels';
import { channelIcons, topBarIcons } from '@/constants/icons';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { getUnreadCount } from '@/lib/notifications';

export default function ChannelsScreen() {
  const router = useRouter();
  const scrollRef = useScrollToTop();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUnreadCount().then((n) => {
        if (active) setUnread(n);
      });
      return () => {
        active = false;
      };
    }, []),
  );

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

        <Text style={styles.title}>Channels</Text>
        <Text style={styles.subtitle}>
          Conversations organized by topic. Choose a channel to join the
          discussion.
        </Text>

        {CHANNELS.map((channel) => (
          <Pressable
            key={channel.key}
            style={styles.channelRow}
            onPress={() =>
              channel.key === 'events'
                ? router.push('/events')
                : channel.key === 'marketplace'
                  ? router.push('/marketplace')
                  : router.push({
                      pathname: '/channel/[channelKey]',
                      params: { channelKey: channel.key },
                    })
            }
          >
            <View style={[styles.iconWrap, { backgroundColor: channel.color }]}>
              {channelIcons[channel.key] ? (
                <Icon
                  source={channelIcons[channel.key]}
                  size={24}
                  color={channel.accent}
                />
              ) : (
                <Text style={styles.icon}>{channel.emoji}</Text>
              )}
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>{channel.name}</Text>
              <Text style={styles.channelDescription}>
                {channel.description}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
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
    fontSize: 30,
    fontWeight: '900',
    color: '#1F1438',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#67597F',
    lineHeight: 22,
    marginBottom: 22,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DFF5',
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1ECFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 22,
  },
  channelInfo: {
    flex: 1,
  },
  chevron: {
    fontSize: 26,
    color: '#6D28D9',
    marginLeft: 8,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1438',
    marginBottom: 3,
  },
  channelDescription: {
    fontSize: 14,
    color: '#76698C',
  },
});
