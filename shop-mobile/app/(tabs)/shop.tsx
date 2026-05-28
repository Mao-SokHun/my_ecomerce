import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MeshBackground } from '@/components/glass/MeshBackground';
import { GlassHeader } from '@/components/GlassHeader';
import { CategoryPills } from '@/components/CategoryPills';
import { ProductCard } from '@/components/ProductCard';
import { categoryApi, productApi } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLanguageStore } from '@/store/languageStore';
import { useCartStore } from '@/store/cartStore';
import { palette } from '@/constants/glassTheme';
import type { ApiResponse, Category, Product } from '@/types';

export default function ShopScreen() {
  const language = useLanguageStore((s) => s.language);
  const addItem = useCartStore((s) => s.addItem);
  const params = useLocalSearchParams<{ category?: string; search?: string }>();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const text = isDark ? palette.text.dark : palette.text.light;

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const category = typeof params.category === 'string' ? params.category : '';
  const search = typeof params.search === 'string' ? params.search : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        categoryApi.getAll(),
        productApi.getAll({
          lang: language,
          limit: 24,
          ...(category ? { category } : {}),
          ...(search ? { search } : {}),
        }),
      ]);
      setCategories(catRes.data.data || []);
      const body = prodRes.data as ApiResponse<Product[]>;
      setProducts(Array.isArray(body.data) ? body.data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [language, category, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <MeshBackground>
      <GlassHeader title={t(language, 'products')} subtitle={search ? `"${search}"` : undefined} />
      <CategoryPills categories={categories} language={language} activeSlug={category} />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={palette.primary} />
      ) : products.length === 0 ? (
        <Text style={[styles.empty, { color: text }]}>{t(language, 'loading')}</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.col}>
              <ProductCard product={item} language={language} onAddToCart={() => addItem(item.id)} />
            </View>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 12, paddingTop: 8, gap: 12 },
  row: { gap: 12 },
  col: { flex: 1 },
  loader: { marginTop: 48 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 16 },
});
