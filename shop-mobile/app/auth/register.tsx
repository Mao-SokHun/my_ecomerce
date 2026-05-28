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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const text = isDark ? palette.text.dark : palette.text.light;
  const muted = isDark ? palette.text.darkMuted : palette.text.lightMuted;

  const onSubmit = async () => {
    try {
      await register(name.trim(), phone.trim(), password, email.trim() || undefined);
      router.back();
    } catch {
      Alert.alert('Error', 'Registration failed');
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, secure?: boolean) => (
    <>
      <Text style={[styles.label, { color: muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        style={[styles.input, { color: text, borderColor: isDark ? glass.border.dark : glass.border.subtle }]}
      />
    </>
  );

  return (
    <MeshBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={28} color={text} />
        </Pressable>

        <Text style={[styles.title, { color: text }]}>{t(language, 'registerWelcome')}</Text>

        <GlassSurface borderRadius={glass.radius.xl} style={styles.form}>
          {field(t(language, 'name'), name, setName)}
          <View style={styles.gap} />
          {field(t(language, 'phone'), phone, setPhone)}
          <View style={styles.gap} />
          {field('Email (optional)', email, setEmail)}
          <View style={styles.gap} />
          {field(t(language, 'password'), password, setPassword, true)}
          <GlassButton
            label={t(language, 'signUp')}
            onPress={onSubmit}
            style={{ marginTop: 24 }}
            disabled={isLoading}
          />
        </GlassSurface>
      </KeyboardAvoidingView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20 },
  close: { alignSelf: 'flex-end', padding: 8 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 24 },
  form: {},
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: glass.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  gap: { height: 14 },
});
