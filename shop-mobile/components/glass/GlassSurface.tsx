import { BlurView } from 'expo-blur';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  useColorScheme,
} from 'react-native';
import { glass } from '@/constants/glassTheme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  borderRadius?: number;
  padded?: boolean;
  strong?: boolean;
};

export function GlassSurface({
  children,
  style,
  intensity,
  borderRadius = glass.radius.lg,
  padded = true,
  strong = false,
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const blurIntensity = intensity ?? (strong ? glass.blur.heavy : glass.blur.medium);

  const fill = isDark
    ? strong
      ? glass.fill.darkStrong
      : glass.fill.dark
    : strong
      ? glass.fill.lightStrong
      : glass.fill.light;

  const borderColor = isDark ? glass.border.dark : glass.border.light;

  return (
    <View
      style={[
        styles.wrap,
        glass.shadow.soft,
        { borderRadius, borderColor },
        style,
      ]}
    >
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              backgroundColor: fill,
            },
          ]}
        />
      ) : (
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
        />
      )}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            backgroundColor: Platform.OS === 'web' ? undefined : fill,
          },
        ]}
      />
      <View style={[styles.highlight, { borderRadius }]} pointerEvents="none" />
      <View style={[padded && styles.content, { borderRadius }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  highlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
    opacity: 0.9,
  },
  content: {
    padding: 16,
  },
});
