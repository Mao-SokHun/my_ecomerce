import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MeshBackground } from '@/components/glass/MeshBackground';
import { GlassHeader } from '@/components/GlassHeader';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { GlassButton } from '@/components/glass/GlassButton';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { t, type AppLanguage } from '@/lib/i18n';
import { palette, glass } from '@/constants/glassTheme';

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: 'km', label: 'ខ្មែរ' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
];

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const text = isDark ? palette.text.dark : palette.text.light;
  const muted = isDark ? palette.text.darkMuted : palette.text.lightMuted;

  return (
    <MeshBackground>
      <GlassHeader title={t(language, 'profile')} />

      <View style={styles.content}>
        <GlassSurface borderRadius={glass.radius.xl} style={styles.card}>
          {isAuthenticated && user ? (
            <>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.name, { color: text }]}>{user.name}</Text>
              {user.email && !user.email.startsWith('fb_') && (
                <Text style={[styles.email, { color: muted }]}>{user.email}</Text>
              )}
              <GlassButton
                label={t(language, 'signOut')}
                variant="ghost"
                onPress={() => logout()}
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <>
              <Text style={[styles.guest, { color: muted }]}>{t(language, 'account')}</Text>
              <GlassButton
                label={t(language, 'signIn')}
                onPress={() => router.push('/auth/login')}
                style={{ marginTop: 12 }}
              />
              <GlassButton
                label={t(language, 'signUp')}
                variant="glass"
                onPress={() => router.push('/auth/register')}
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </GlassSurface>

        <Text style={[styles.section, { color: muted }]}>Language</Text>
        <GlassSurface padded={false} borderRadius={glass.radius.lg}>
          <View style={styles.langRow}>
            {LANGS.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => setLanguage(l.code)}
                style={[
                  styles.langBtn,
                  language === l.code && styles.langBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.langLabel,
                    { color: language === l.code ? '#fff' : text },
                  ]}
                >
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassSurface>

        {isAuthenticated && (
          <GlassSurface borderRadius={glass.radius.lg} style={styles.menu}>
            <MenuRow icon="receipt-outline" label={t(language, 'myOrders')} color={text} />
            <MenuRow icon="heart-outline" label={t(language, 'wishlist')} color={text} />
          </GlassSurface>
        )}
      </View>
    </MeshBackground>
  );
}

function MenuRow({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <Pressable style={styles.menuRow}>
      <Ionicons name={icon} size={22} color={palette.primary} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={color} style={{ opacity: 0.4 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16, paddingBottom: 120 },
  card: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', marginTop: 12 },
  email: { fontSize: 14, marginTop: 4 },
  guest: { fontSize: 16 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  langRow: { flexDirection: 'row', padding: 6, gap: 6 },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: glass.radius.md,
    alignItems: 'center',
  },
  langBtnActive: { backgroundColor: palette.primary },
  langLabel: { fontSize: 15, fontWeight: '700' },
  menu: { gap: 0, paddingVertical: 4 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
});
