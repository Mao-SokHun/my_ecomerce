import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MeshBackground } from '@/components/glass/MeshBackground';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { GlassButton } from '@/components/glass/GlassButton';
import { productApi } from '@/lib/api';
import { useLanguageStore } from '@/store/languageStore';
import { useCartStore } from '@/store/cartStore';
import { t } from '@/lib/i18n';
import { formatPrice, getDiscountPercent } from '@/lib/utils';
import { palette, glass } from '@/constants/glassTheme';
import type { Product } from '@/types';

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const language = useLanguageStore((s) => s.language);
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const text = isDark ? palette.text.dark : palette.text.light;
  const muted = isDark ? palette.text.darkMuted : palette.text.lightMuted;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!slug) return;
    productApi
      .getBySlug(slug, language)
      .then(({ data }) => setProduct(data.data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, language]);

  const handleAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, qty);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <MeshBackground>
        <ActivityIndicator style={{ marginTop: 80 }} color={palette.primary} />
      </MeshBackground>
    );
  }

  if (!product) {
    return (
      <MeshBackground>
        <Text style={{ textAlign: 'center', marginTop: 80, color: text }}>Not found</Text>
      </MeshBackground>
    );
  }

  const image = product.images[0] || product.thumbnail;
  const discount = getDiscountPercent(product.price, product.comparePrice || 0);

  return (
    <MeshBackground>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}>
        <Pressable style={[styles.back, { top: insets.top + 8 }]} onPress={() => router.back()}>
          <GlassSurface padded={false} borderRadius={glass.radius.pill} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={text} />
          </GlassSurface>
        </Pressable>

        <GlassSurface padded={false} borderRadius={glass.radius.xl} style={styles.hero}>
          {image ? (
            <Image source={{ uri: image }} style={styles.heroImage} contentFit="contain" />
          ) : (
            <View style={[styles.heroImage, styles.heroPh]} />
          )}
          {discount > 0 && (
            <View style={styles.discount}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
        </GlassSurface>

        <View style={styles.body}>
          {product.brand && (
            <Text style={[styles.brand, { color: palette.primary }]}>{product.brand}</Text>
          )}
          <Text style={[styles.title, { color: text }]}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: text }]}>{formatPrice(product.price)}</Text>
            {product.comparePrice && product.comparePrice > product.price && (
              <Text style={[styles.compare, { color: muted }]}>{formatPrice(product.comparePrice)}</Text>
            )}
          </View>
          {product.shortDesc && (
            <Text style={[styles.desc, { color: muted }]}>{product.shortDesc}</Text>
          )}

          <GlassSurface borderRadius={glass.radius.md} style={styles.qtyCard}>
            <View style={styles.qtyRow}>
              <Text style={[styles.qtyLabel, { color: text }]}>Qty</Text>
              <View style={styles.qtyControls}>
                <Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={styles.qtyBtn}>
                  <Ionicons name="remove" size={20} color={palette.primary} />
                </Pressable>
                <Text style={[styles.qtyVal, { color: text }]}>{qty}</Text>
                <Pressable
                  onPress={() => setQty(Math.min(product.stock, qty + 1))}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="add" size={20} color={palette.primary} />
                </Pressable>
              </View>
            </View>
          </GlassSurface>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <GlassSurface strong borderRadius={glass.radius.xl} style={styles.footerGlass}>
          <GlassButton
            label={adding ? t(language, 'loading') : product.stock === 0 ? t(language, 'outOfStock') : t(language, 'addToCart')}
            onPress={handleAdd}
            disabled={product.stock === 0 || adding}
            style={{ flex: 1 }}
          />
        </GlassSurface>
      </View>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16 },
  back: { position: 'absolute', left: 16, zIndex: 10 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 56, overflow: 'hidden' },
  heroImage: { width: '100%', aspectRatio: 1 },
  heroPh: { backgroundColor: 'rgba(99,102,241,0.15)' },
  discount: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: palette.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: glass.radius.sm,
  },
  discountText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  body: { marginTop: 20, gap: 8 },
  brand: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 },
  price: { fontSize: 28, fontWeight: '900' },
  compare: { fontSize: 16, textDecorationLine: 'line-through' },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  qtyCard: { marginTop: 16 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { fontSize: 16, fontWeight: '600' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
  },
  footerGlass: { padding: 12 },
});
