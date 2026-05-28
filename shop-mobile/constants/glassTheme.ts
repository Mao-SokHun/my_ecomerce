/** iOS-style liquid glass design tokens */
export const glass = {
  blur: {
    light: 72,
    medium: 88,
    heavy: 100,
  },
  radius: {
    sm: 14,
    md: 20,
    lg: 28,
    xl: 36,
    pill: 999,
  },
  border: {
    light: 'rgba(255, 255, 255, 0.45)',
    dark: 'rgba(255, 255, 255, 0.12)',
    subtle: 'rgba(255, 255, 255, 0.22)',
  },
  fill: {
    light: 'rgba(255, 255, 255, 0.62)',
    lightStrong: 'rgba(255, 255, 255, 0.78)',
    dark: 'rgba(28, 28, 32, 0.55)',
    darkStrong: 'rgba(18, 18, 22, 0.72)',
  },
  shadow: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    glow: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 6,
    },
  },
} as const;

export const palette = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#818cf8',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  text: {
    light: '#0f172a',
    lightMuted: 'rgba(15, 23, 42, 0.65)',
    dark: '#f8fafc',
    darkMuted: 'rgba(248, 250, 252, 0.7)',
  },
  mesh: {
    light: ['#e0e7ff', '#f0f4ff', '#fce7f3', '#ddd6fe'] as const,
    dark: ['#0f0a1a', '#1e1b4b', '#312e81', '#1e293b'] as const,
  },
};
