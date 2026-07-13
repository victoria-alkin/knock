import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

// Patches Text/TextInput to default to the Inter font (side-effect import).
import '@/lib/register-fonts';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: require('@/assets/fonts/Inter.ttf'),
  });

  // On native, wait for the font so there's no flash. On web, render right
  // away (the browser swaps Inter in via CSS, and this keeps SSR non-empty).
  if (!fontsLoaded && Platform.OS !== 'web') return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
