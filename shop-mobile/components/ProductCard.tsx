import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { formatPrice, getDiscountPercent } from '@/lib/utils';
import { palette, glass } from '@/constants/glassTheme';
import type { Product } from '@/types';
import { t, type AppLanguage } from '@/lib/i18n';

type Props = {
  product: Product;
  language: AppLanguage;
  onAddToCart?: () => void;
};

export function ProductCard({ product, language, onAddToCart }: Props) {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const discount = getDiscountPercent(product.price, product.comparePrice || 0);
  const text = isDark ? palette.text.dark : palette.text.light;
  const muted = isDark ? palette.text.darkMuted : palette.text.lightMuted;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/product/${product.slug}`);
      }}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
    >
      <GlassSurface padded={false} borderRadius={glass.radius.lg} style={styles.card}>
        <View style={styles.imageWrap}>
          {product.thumbnail ? (
            <Image source={{ uri: product.thumbnail }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}
          {discount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>-{discount}%</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: text }]}>{formatPrice(product.price)}</Text>
            {product.comparePrice && product.comparePrice > product.price && (
              <Text style={[styles.compare, { color: muted }]}>
                {formatPrice(product.comparePrice)}
              </Text>
            )}
          </View>
          {onAddToCart && product.stock > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAddToCart();
              }}
              style={styles.addBtn}
            >
              <Text style={styles.addLabel}>{t(language, 'addToCart')}</Text>
            </Pressable>
          )}
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: glass.radius.lg,
    borderTopRightRadius: glass.radius.lg,
  },
  placeholder: { backgroundColor: 'rgba(99,102,241,0.15)' },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: palette.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: glass.radius.sm,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  info: { padding: 12, gap: 6 },
  name: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 15, fontWeight: '800' },
  compare: { fontSize: 12, textDecorationLine: 'line-through' },
  addBtn: {
    marginTop: 4,
    backgroundColor: palette.primary,
    paddingVertical: 8,
    borderRadius: glass.radius.sm,
    alignItems: 'center',
  },
  addLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
