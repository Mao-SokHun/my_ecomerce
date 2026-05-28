import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glass, palette } from '@/constants/glassTheme';
import { useLanguageStore } from '@/store/languageStore';
import { useCartStore } from '@/store/cartStore';
import { t } from '@/lib/i18n';

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const language = useLanguageStore((s) => s.language);
  const cartCount = useCartStore((s) => s.itemCount());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: isDark ? palette.text.darkMuted : palette.text.lightMuted,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12),
          height: 64,
          borderRadius: glass.radius.xl,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          paddingBottom: 0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' || Platform.OS === 'android' ? (
            <View style={[StyleSheet.absoluteFill, styles.tabBg, { borderRadius: glass.radius.xl }]}>
              <BlurView
                intensity={glass.blur.heavy}
                tint={isDark ? 'dark' : 'light'}
                style={[StyleSheet.absoluteFill, { borderRadius: glass.radius.xl, overflow: 'hidden' }]}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: isDark ? glass.fill.darkStrong : glass.fill.lightStrong,
                    borderRadius: glass.radius.xl,
                    borderWidth: 1,
                    borderColor: isDark ? glass.border.dark : glass.border.light,
                  },
                ]}
              />
            </View>
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark ? glass.fill.darkStrong : glass.fill.light,
                  borderRadius: glass.radius.xl,
                },
              ]}
            />
          ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t(language, 'home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t(language, 'shop'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t(language, 'cart'),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="bag" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t(language, 'profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBg: {
    ...glass.shadow.soft,
    overflow: 'hidden',
  },
});
