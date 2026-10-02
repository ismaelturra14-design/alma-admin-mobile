import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Motion, Radii, Spacing, Typography } from '@/constants/theme';
import type { UserData } from '@/features/auth/types/auth';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { DrawerMenuSection } from '@/navigation/menuConfig';

type HomeOverviewProps = {
  user: UserData | null;
  menuSections: DrawerMenuSection[];
  onSelectModule: (route: string) => void;
};

export function HomeOverview({ user, menuSections, onSelectModule }: HomeOverviewProps) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  const formattedDate = today.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = user?.user_fname?.trim() || '—';
  const shortcuts = useMemo(
    () => menuSections.flatMap((section) => section.items).filter((item) => item.route !== 'Inicio').slice(0, 4),
    [menuSections],
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View entering={reduceMotion === false ? FadeInDown.duration(Motion.duration.medium) : undefined} style={[styles.welcome, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.date, { color: colors.primary }]}>{formattedDate}</Text>
        <Text style={[styles.title, { color: colors.primaryStrong }]}>{greeting}, {firstName}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Alma Admin</Text>
      </Animated.View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Accesos</Text>
        <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Módulos disponibles para tu cuenta</Text>
      </View>

      {shortcuts.length ? shortcuts.map((item, index) => (
        <Animated.View key={item.id} entering={reduceMotion === false ? FadeInDown.delay(60 + index * 45).duration(Motion.duration.medium) : undefined}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={`Abre el módulo ${item.label}.`}
            onPress={() => onSelectModule(item.route)}
            style={({ pressed }) => [styles.shortcut, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={19} color={colors.primary} accessible={false} />
            </View>
            <Text style={[styles.shortcutLabel, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.muted} accessible={false} />
          </Pressable>
        </Animated.View>
      )) : (
        <View style={[styles.noShortcuts, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.noShortcutsText, { color: colors.textSecondary }]}>No hay módulos disponibles para esta cuenta.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: Spacing.seven, gap: Spacing.two },
  welcome: { borderRadius: Radii.large, padding: Spacing.five, marginBottom: Spacing.four },
  date: { ...Typography.caption, textTransform: 'capitalize' },
  title: { ...Typography.h1, marginTop: Spacing.two },
  subtitle: { ...Typography.body, marginTop: Spacing.one, opacity: 0.88 },
  sectionHeader: { marginBottom: Spacing.one },
  sectionTitle: { ...Typography.h2 },
  sectionCaption: { ...Typography.caption, marginTop: Spacing.one },
  shortcut: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium },
  shortcutIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.small },
  shortcutLabel: { flex: 1, ...Typography.bodyStrong },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.85 },
  noShortcuts: { borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.four },
  noShortcutsText: { ...Typography.body, textAlign: 'center' },
});