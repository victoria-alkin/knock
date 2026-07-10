import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHANNELS } from '@/constants/channels';

export default function ChannelsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
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
              router.push({
                pathname: '/channel/[channelKey]',
                params: { channelKey: channel.key },
              })
            }
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{channel.emoji}</Text>
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
    backgroundColor: '#F7F2FF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
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
