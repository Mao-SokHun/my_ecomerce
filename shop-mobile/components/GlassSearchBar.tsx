import { TextInput, StyleSheet, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { glass, palette } from '@/constants/glassTheme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  onSubmit?: () => void;
};

export function GlassSearchBar({ value, onChangeText, placeholder, onSubmit }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <GlassSurface padded={false} borderRadius={glass.radius.pill} strong style={styles.wrap}>
      <View style={styles.inner}>
        <Ionicons
          name="search"
          size={20}
          color={isDark ? palette.text.darkMuted : palette.text.lightMuted}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? palette.text.darkMuted : palette.text.lightMuted}
          style={[styles.input, { color: isDark ? palette.text.dark : palette.text.light }]}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16 },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
});
