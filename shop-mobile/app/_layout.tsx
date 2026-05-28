import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { useCartStore } from '@/store/cartStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hydrateLang = useLanguageStore((s) => s.hydrate);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const isAuthReady = useAuthStore((s) => s.isReady);
  const langReady = useLanguageStore((s) => s.hydrated);

  useEffect(() => {
    hydrateLang();
    bootstrap().then(() => fetchCart());
  }, [bootstrap, hydrateLang, fetchCart]);

  useEffect(() => {
    if (isAuthReady && langReady) SplashScreen.hideAsync();
  }, [isAuthReady, langReady]);

  if (!isAuthReady || !langReady) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[slug]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="auth/register" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
