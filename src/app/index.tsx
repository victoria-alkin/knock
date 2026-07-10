import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isOnboarded } from '@/lib/membership';

type GateStatus = 'loading' | 'new' | 'onboarded';

export default function WelcomeScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>('loading');

  useEffect(() => {
    let active = true;
    isOnboarded().then((ok) => {
      if (active) setStatus(ok ? 'onboarded' : 'new');
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === 'onboarded') {
    return <Redirect href="/home" />;
  }

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require('../../assets/images/knock-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ActivityIndicator color="#6D28D9" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/knock-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.headline}>Ask Your Building</Text>

        <Text style={styles.description}>
          The private community app for your apartment building.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/find-building')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 72,
  },
  logo: {
    width: 270,
    height: 110,
    marginBottom: 28,
  },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1F1438',
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 18,
    color: '#67597F',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 330,
    marginBottom: 34,
  },
  button: {
    backgroundColor: '#6D28D9',
    paddingVertical: 17,
    paddingHorizontal: 36,
    borderRadius: 999,
    width: '100%',
    maxWidth: 315,
    alignItems: 'center',
    shadowColor: '#6D28D9',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});