import { StyleSheet, View, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '@/constants/glassTheme';

type Props = { children: React.ReactNode };

export function MeshBackground({ children }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? palette.mesh.dark : palette.mesh.light;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors[0], colors[1], colors[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${colors[3]}99`, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.2)',
            top: -80,
            right: -40,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            backgroundColor: isDark ? 'rgba(244, 114, 182, 0.25)' : 'rgba(244, 114, 182, 0.15)',
            bottom: 120,
            left: -60,
            width: 220,
            height: 220,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
});
