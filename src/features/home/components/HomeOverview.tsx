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
  onOpenMenu: () => void;
};

export function HomeOverview({
  user,
  menuSections,
  onSelectModule,
  onOpenMenu,
}: HomeOverviewProps) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const today = new Date();
  const greeting =
    today.getHours() < 12
      ? 'Buenos días'
      : today.getHours() < 19
        ? 'Buenas tardes'
        : 'Buenas noches';
  const formattedDate = today.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const firstName = user?.user_fname?.trim();
  const groupName = user?.user_group_name?.trim();
  const shortcuts = useMemo(
    () =>
      menuSections
        .flatMap((section) =>
          section.items.map((item) => ({ ...item, sectionTitle: section.title })),
        )
        .filter((item) => item.route !== 'Inicio' && !item.underDevelopment)
        .slice(0, 4),
    [menuSections],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={reduceMotion === false ? FadeInDown.duration(Motion.duration.medium) : undefined}
        style={[styles.hero, { backgroundColor: colors.primarySoft }]}
      >
        <View style={[styles.heroMark, { backgroundColor: colors.surface }]}>
          <Ionicons name="medical-outline" size={23} color={colors.primary} accessible={false} />
        </View>
        <Text style={[styles.date, { color: colors.primary }]}>{formattedDate}</Text>
        <Text style={[styles.title, { color: colors.primaryStrong }]}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tu espacio de trabajo en Alma Médica
        </Text>
        {groupName ? (
          <View style={[styles.profileBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name="person-circle-outline" size={17} color={colors.primary} accessible={false} />
            <Text style={[styles.profileBadgeText, { color: colors.primaryStrong }]} numberOfLines={1}>
              {groupName}
            </Text>
          </View>
        ) : null}
        <View
          accessible={false}
          style={[styles.heroDecoration, styles.heroDecorationLarge, { borderColor: colors.primary, opacity: 0.08 }]}
        />
        <View
          accessible={false}
          style={[styles.heroDecoration, styles.heroDecorationSmall, { backgroundColor: colors.primary, opacity: 0.06 }]}
        />
      </Animated.View>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionCopy}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accesos para ti</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
            Herramientas habilitadas para tu perfil
          </Text>
        </View>
        {shortcuts.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todos los módulos"
            accessibilityHint="Abre el menú con los módulos disponibles."
            onPress={onOpenMenu}
            hitSlop={8}
            style={({ pressed }) => [
              styles.allModulesButton,
              { backgroundColor: colors.primarySoft },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="grid-outline" size={16} color={colors.primary} accessible={false} />
            <Text style={[styles.allModulesText, { color: colors.primary }]}>Ver menú</Text>
          </Pressable>
        ) : null}
      </View>

      {shortcuts.length ? (
        <View style={styles.shortcutGrid}>
          {shortcuts.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={
                reduceMotion === false
                  ? FadeInDown.delay(55 + index * 55).duration(Motion.duration.medium)
                  : undefined
              }
              style={styles.shortcutCell}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${item.sectionTitle}`}
                accessibilityHint={`Abre el módulo ${item.label}.`}
                onPress={() => onSelectModule(item.route)}
                style={({ pressed }) => [
                  styles.shortcut,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && styles.shortcutPressed,
                ]}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={colors.primary}
                    accessible={false}
                  />
                </View>
                <Text style={[styles.shortcutLabel, { color: colors.text }]} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={[styles.shortcutSection, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.sectionTitle}
                </Text>
                <View style={[styles.shortcutArrow, { backgroundColor: colors.background }]}>
                  <Ionicons name="arrow-forward" size={15} color={colors.muted} accessible={false} />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="apps-outline" size={22} color={colors.primary} accessible={false} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aún no hay módulos disponibles</Text>
          <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
            Si necesitas acceso, ponte en contacto con el administrador de tu cuenta.
          </Text>
        </View>
      )}

      <View style={[styles.footerNote, { borderTopColor: colors.border }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.muted} accessible={false} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Tus accesos se muestran según los permisos de tu cuenta.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.seven,
    gap: Spacing.four,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radii.large,
    padding: Spacing.five,
    minHeight: 208,
    justifyContent: 'center',
  },
  heroMark: {
    width: 42,
    height: 42,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  date: { ...Typography.caption, textTransform: 'capitalize' },
  title: { ...Typography.h1, marginTop: Spacing.one },
  subtitle: { ...Typography.body, marginTop: Spacing.one },
  profileBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
  },
  profileBadgeText: { ...Typography.caption, flexShrink: 1 },
  heroDecoration: { position: 'absolute', borderRadius: Radii.pill },
  heroDecorationLarge: {
    width: 150,
    height: 150,
    borderWidth: 28,
    right: -50,
    top: -64,
  },
  heroDecorationSmall: {
    width: 86,
    height: 86,
    right: 20,
    bottom: -50,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { ...Typography.h2 },
  sectionCaption: { ...Typography.caption, marginTop: Spacing.one },
  allModulesButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
  },
  allModulesText: { ...Typography.caption, fontWeight: '700' },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  shortcutCell: { flexGrow: 1, flexBasis: '45%', minWidth: 130 },
  shortcut: {
    minHeight: 142,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
    overflow: 'hidden',
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.small,
    marginBottom: Spacing.three,
  },
  shortcutLabel: { ...Typography.bodyStrong, paddingRight: Spacing.five },
  shortcutSection: { ...Typography.caption, marginTop: Spacing.one },
  shortcutArrow: {
    position: 'absolute',
    right: Spacing.three,
    top: Spacing.three,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  shortcutPressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  pressed: { opacity: 0.82 },
  emptyState: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.five,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  emptyTitle: { ...Typography.bodyStrong, textAlign: 'center', marginTop: Spacing.three },
  emptyCopy: { ...Typography.caption, textAlign: 'center', marginTop: Spacing.one },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  footerText: { ...Typography.caption, flexShrink: 1 },
});
