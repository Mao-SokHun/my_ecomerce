import { ScrollView, Pressable, Text, StyleSheet, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { glass, palette } from '@/constants/glassTheme';
import type { Category } from '@/types';
import { t, type AppLanguage } from '@/lib/i18n';

const ICONS: Record<string, string> = {
  electronics: '📱',
  fashion: '👕',
  'home-living': '🏠',
  sports: '⚽',
  books: '📚',
  beauty: '💄',
  groceries: '🛒',
  automotive: '🚗',
};

type Props = {
  categories: Category[];
  language: AppLanguage;
  activeSlug?: string;
};

export function CategoryPills({ categories, language, activeSlug }: Props) {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const pill = (active: boolean) => ({
    backgroundColor: active
      ? palette.primary
      : isDark
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.55)',
    borderColor: active ? palette.primary : isDark ? glass.border.dark : glass.border.subtle,
    color: active ? '#fff' : isDark ? palette.text.dark : palette.text.light,
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/(tabs)/shop');
        }}
        style={[styles.pill, pill(!activeSlug)]}
      >
        <Text style={[styles.label, { color: pill(!activeSlug).color }]}>{t(language, 'allProducts')}</Text>
      </Pressable>
      {categories.map((cat) => {
        const active = activeSlug === cat.slug;
        const p = pill(active);
        return (
          <Pressable
            key={cat.id}
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: '/(tabs)/shop', params: { category: cat.slug } });
            }}
            style={[styles.pill, { backgroundColor: p.backgroundColor, borderColor: p.borderColor }]}
          >
            <Text style={styles.emoji}>{ICONS[cat.slug] || '🏷️'}</Text>
            <Text style={[styles.label, { color: p.color }]} numberOfLines={1}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: glass.radius.pill,
    borderWidth: 1,
    maxWidth: 200,
  },
  emoji: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600' },
});
