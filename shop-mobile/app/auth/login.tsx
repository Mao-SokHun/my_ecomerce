import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MeshBackground } from '@/components/glass/MeshBackground';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { GlassButton } from '@/components/glass/GlassButton';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { palette, glass } from '@/constants/glassTheme';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const text = isDark ? palette.text.dark : palette.text.light;
  const muted = isDark ? palette.text.darkMuted : palette.text.lightMuted;

  const onSubmit = async () => {
    try {
      await login(identifier.trim(), password);
      router.back();
    } catch {
      Alert.alert('Error', 'Invalid credentials');
    }
  };

  return (
    <MeshBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={28} color={text} />
        </Pressable>

        <Text style={[styles.title, { color: text }]}>{t(language, 'loginWelcome')}</Text>
        <Text style={[styles.sub, { color: muted }]}>{t(language, 'brand')}</Text>

        <GlassSurface borderRadius={glass.radius.xl} style={styles.form}>
          <Text style={[styles.label, { color: muted }]}>{t(language, 'emailOrPhone')}</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { color: text, borderColor: isDark ? glass.border.dark : glass.border.subtle }]}
          />
          <Text style={[styles.label, { color: muted, marginTop: 16 }]}>{t(language, 'password')}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, { color: text, borderColor: isDark ? glass.border.dark : glass.border.subtle }]}
          />
          <GlassButton
            label={t(language, 'signIn')}
            onPress={onSubmit}
            style={{ marginTop: 24 }}
            disabled={isLoading}
          />
        </GlassSurface>

        <Pressable onPress={() => router.replace('/auth/register')}>
          <Text style={styles.link}>{t(language, 'signUp')}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20 },
  close: { alignSelf: 'flex-end', padding: 8 },
  title: { fontSize: 32, fontWeight: '800', marginTop: 8 },
  sub: { fontSize: 16, marginTop: 4, marginBottom: 24 },
  form: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: glass.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  link: {
    textAlign: 'center',
    color: palette.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
