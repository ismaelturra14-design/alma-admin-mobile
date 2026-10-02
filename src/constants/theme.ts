/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Palette = {
  primary: {
    50: '#f4faff', 100: '#e8f4ff', 200: '#cfe7fb', 300: '#acd4f2',
    400: '#82bce4', 500: '#5a9fce', 600: '#3f83b0', 700: '#306b94',
    800: '#275678', 900: '#20445f',
  },
  neutral: {
    50: '#f6fafc', 100: '#eaf1f4', 200: '#d6e3e9', 300: '#b7cbd5',
    400: '#8aa7b6', 500: '#657f8d', 600: '#4a626f', 700: '#344a56',
    800: '#213641', 900: '#132731',
  },
  accent: { 50: '#fff6e8', 100: '#ffebc7', 300: '#f6c46f', 500: '#d99027', 700: '#996219' },
  success: { foreground: '#275678', background: '#f4faff', border: '#cfe7fb' },
  warning: { foreground: '#80520d', background: '#fff4dc', border: '#f3d28f' },
  error: { foreground: '#a33232', background: '#fff0ee', border: '#f1c2bc' },
  info: { foreground: '#275678', background: '#e8f4ff', border: '#cfe7fb' },
} as const;

export const Theme = {
  light: {
    primary: Palette.primary[700],
    primaryStrong: Palette.primary[800],
    primarySoft: Palette.primary[50],
    primaryGradient: `linear-gradient(180deg, ${Palette.primary[100]}, ${Palette.primary[300]})`,
    accent: Palette.accent[500],
    text: Palette.neutral[900],
    textSecondary: Palette.neutral[600],
    background: '#ffffff',
    surface: '#ffffff',
    surfaceRaised: '#ffffff',
    surfaceSelected: Palette.primary[100],
    border: Palette.neutral[200],
    muted: Palette.neutral[500],
    success: Palette.success.foreground,
    successBackground: Palette.success.background,
    successBorder: Palette.success.border,
    warning: Palette.warning.foreground,
    warningBackground: Palette.warning.background,
    error: Palette.error.foreground,
    errorBackground: Palette.error.background,
    info: Palette.info.foreground,
    infoBackground: Palette.info.background,
    overlay: 'rgba(19, 39, 49, 0.42)',
  },
  dark: {
    primary: '#3f83b0',
    primaryStrong: '#cfe7fb',
    primarySoft: '#1d3445',
    primaryGradient: 'linear-gradient(180deg, #29485e, #1d3445)',
    accent: '#f0bb65',
    text: '#eef6f9',
    textSecondary: '#bacbd2',
    background: '#111a1e',
    surface: '#1a272d',
    surfaceRaised: '#22343b',
    surfaceSelected: '#29485e',
    border: '#354c55',
    muted: '#94aab3',
    success: '#acd4f2',
    successBackground: '#1d3445',
    successBorder: '#3c5d76',
    warning: '#f0c878',
    warningBackground: '#40351f',
    error: '#f0aaa0',
    errorBackground: '#432926',
    info: '#cfe7fb',
    infoBackground: '#223b50',
    overlay: 'rgba(0, 0, 0, 0.62)',
  },
} as const;

export const Colors = {
  light: {
    text: Theme.light.text,
    background: Theme.light.background,
    backgroundElement: Theme.light.surface,
    backgroundSelected: Theme.light.surfaceSelected,
    textSecondary: Theme.light.textSecondary,
  },
  dark: {
    text: Theme.dark.text,
    background: Theme.dark.background,
    backgroundElement: Theme.dark.surface,
    backgroundSelected: Theme.dark.surfaceSelected,
    textSecondary: Theme.dark.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  h1: { fontSize: 26, lineHeight: 34, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '500' as const },
} as const;

export const Radii = { small: 8, medium: 12, large: 18, pill: 999 } as const;

export const Elevation = {
  low: { shadowColor: '#132731', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  medium: { shadowColor: '#132731', shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
} as const;

export const Motion = {
  duration: { fast: 150, medium: 240, slow: 360 },
  easing: { standard: [0.2, 0, 0, 1] as const, emphasized: [0.2, 0, 0, 1] as const },
  spring: { damping: 18, stiffness: 180, mass: 0.8 },
} as const;

export const PAGE_SIZE = 10;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
