import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MeshBackground } from '@/components/glass/MeshBackground';
import { GlassHeader } from '@/components/GlassHeader';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { GlassButton } from '@/components/glass/GlassButton';
import { useCartStore } from '@/store/cartStore';
import { useLanguageStore } from '@/store/languageStore';
import { t } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';
import { palette, glass } from '@/constants/glassTheme';

export default function CartScreen() {
  const language = useLanguageStore((s) => s.language);
  const { cart, isLoading, fetchCart, updateItem, removeItem } = useCartStore();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const text = isDark ? palette.text.dark : palette.text.light;
  const muted = isDark ? palette.text.darkMuted : palette.text.lightMuted;

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const items = cart?.items ?? [];

  return (
    <MeshBackground>
      <GlassHeader title={t(language, 'cart')} />

      {isLoading && !cart ? (
        <ActivityIndicator style={styles.loader} color={palette.primary} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <GlassSurface borderRadius={glass.radius.xl} style={styles.emptyCard}>
            <Ionicons name="bag-outline" size={48} color={palette.primary} />
            <Text style={[styles.emptyTitle, { color: text }]}>{t(language, 'emptyCart')}</Text>
            <GlassButton
              label={t(language, 'continueShopping')}
              onPress={() => router.push('/(tabs)/shop')}
            />
          </GlassSurface>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <GlassSurface style={styles.item} borderRadius={glass.radius.md}>
                <View style={styles.itemRow}>
                  {item.product.thumbnail ? (
                    <Image source={{ uri: item.product.thumbnail }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPh]} />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: text }]} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    <Text style={[styles.itemPrice, { color: text }]}>
                      {formatPrice(item.product.price)}
                    </Text>
                    <View style={styles.qtyRow}>
                      <Pressable
                        onPress={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="remove" size={18} color={palette.primary} />
                      </Pressable>
                      <Text style={[styles.qty, { color: text }]}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => updateItem(item.id, item.quantity + 1)}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="add" size={18} color={palette.primary} />
                      </Pressable>
                      <Pressable onPress={() => removeItem(item.id)} style={styles.trash}>
                        <Ionicons name="trash-outline" size={20} color={palette.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </GlassSurface>
            )}
            ListFooterComponent={<View style={{ height: 160 }} />}
          />

          <GlassSurface strong style={styles.summary} borderRadius={glass.radius.xl}>
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: muted }]}>{t(language, 'total')}</Text>
              <Text style={[styles.totalValue, { color: text }]}>
                {formatPrice(cart?.subtotal ?? 0)}
              </Text>
            </View>
            <GlassButton label={t(language, 'checkout')} onPress={() => {}} />
          </GlassSurface>
        </>
      )}
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 48 },
  empty: { flex: 1, padding: 24, justifyContent: 'center' },
  emptyCard: { alignItems: 'center', gap: 16, paddingVertical: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  list: { padding: 16, gap: 12 },
  item: { marginBottom: 0 },
  itemRow: { flexDirection: 'row', gap: 14 },
  thumb: { width: 72, height: 72, borderRadius: glass.radius.sm },
  thumbPh: { backgroundColor: 'rgba(99,102,241,0.2)' },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemPrice: { fontSize: 16, fontWeight: '800' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  trash: { marginLeft: 'auto' },
  summary: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  totalLabel: { fontSize: 15, fontWeight: '500' },
  totalValue: { fontSize: 22, fontWeight: '800' },
});
