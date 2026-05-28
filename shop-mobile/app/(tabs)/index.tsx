import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MeshBackground } from '@/components/glass/MeshBackground';
import { GlassHeader } from '@/components/GlassHeader';
import { GlassSearchBar } from '@/components/GlassSearchBar';
import { CategoryPills } from '@/components/CategoryPills';
import { ProductCard } from '@/components/ProductCard';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { categoryApi, productApi } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLanguageStore } from '@/store/languageStore';
import { useCartStore } from '@/store/cartStore';
import { palette, glass } from '@/constants/glassTheme';
import type { Category, Product } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const language = useLanguageStore((s) => s.language);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const text = isDark ? palette.text.dark : palette.text.light;

  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [catRes, featRes] = await Promise.all([
        categoryApi.getAll(),
        productApi.getFeatured(language),
      ]);
      setCategories(catRes.data.data || []);
      setFeatured(featRes.data.data || []);
    } catch {
      setCategories([]);
      setFeatured([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = () => {
    const q = search.trim();
    router.push({
      pathname: '/(tabs)/shop',
      params: q ? { search: q } : {},
    });
  };

  return (
    <MeshBackground>
      <GlassHeader
        large
        title={t(language, 'brand')}
        subtitle={t(language, 'freeShipping')}
        right={
          <GlassSurface padded={false} borderRadius={glass.radius.pill} style={styles.langChip}>
            <View style={styles.langInner}>
              <Ionicons name="globe-outline" size={18} color={palette.primary} />
            </View>
          </GlassSurface>
        }
      />

      <View style={styles.searchGap}>
        <GlassSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t(language, 'searchPlaceholder')}
          onSubmit={onSearch}
        />
      </View>

      <CategoryPills categories={categories} language={language} />

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: text }]}>{t(language, 'featuredProducts')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={palette.primary} />
      ) : (
        <FlatList
          data={featured}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          renderItem={({ item }) => (
            <View style={styles.col}>
              <ProductCard
                product={item}
                language={language}
                onAddToCart={() => addItem(item.id)}
              />
            </View>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  searchGap: { marginTop: 8, marginBottom: 12 },
  langChip: { width: 44, height: 44 },
  langInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { paddingHorizontal: 20, marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  list: { paddingHorizontal: 12, gap: 12 },
  row: { gap: 12 },
  col: { flex: 1 },
  loader: { marginTop: 40 },
});
