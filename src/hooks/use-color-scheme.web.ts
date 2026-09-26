import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * This is intentionally lightweight for the web project; the native hook is used directly.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();

  return colorScheme ?? 'light';
}
