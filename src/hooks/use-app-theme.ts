import { Theme } from '@/constants/theme';

export function useAppTheme() {
  return { mode: 'light', colors: Theme.light } as const;
}