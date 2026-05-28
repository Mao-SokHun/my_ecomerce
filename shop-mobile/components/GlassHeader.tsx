import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { glass, palette } from '@/constants/glassTheme';

type Props = {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  large?: boolean;
};

export function GlassHeader({ title, subtitle, right, large }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const textColor = isDark ? palette.text.dark : palette.text.light;
  const muted = isDark ? palette.text.darkMuted : palette.text.lightMuted;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={glass.blur.heavy}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? glass.fill.darkStrong : glass.fill.lightStrong,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? glass.border.dark : glass.border.subtle,
          },
        ]}
      />
      <View style={styles.row}>
        <View style={styles.titles}>
          {title ? (
            <Text style={[large ? styles.largeTitle : styles.title, { color: textColor }]}>
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  titles: { flex: 1 },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
});
