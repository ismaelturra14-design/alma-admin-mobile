import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Elevation, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const { colors } = useAppTheme();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—';
  return (
    <View accessibilityRole="image" accessibilityLabel={`Iniciales: ${initials}`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft }]}>
      <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
    </View>
  );
}

export function ListItem({ title, subtitle, leading, trailing, onPress }: {
  title: string; subtitle?: string; leading?: React.ReactNode; trailing?: React.ReactNode; onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const content = (
    <>
      {leading}
      <View style={styles.listItemCopy}>
        <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </>
  );
  if (!onPress) return <View style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={subtitle ?? `Abre ${title}.`} onPress={onPress} style={({ pressed }) => [styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'error' | 'info' | 'neutral' }) {
  const { colors } = useAppTheme();
  const palette = {
    success: [colors.successBackground, colors.success], warning: [colors.warningBackground, colors.warning],
    error: [colors.errorBackground, colors.error], info: [colors.infoBackground, colors.info],
    neutral: [colors.surfaceSelected, colors.textSecondary],
  }[tone];
  return <View style={[styles.badge, { backgroundColor: palette[0] }]}><Text style={[styles.badgeText, { color: palette[1] }]}>{label}</Text></View>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="file-tray-outline" size={24} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
      {action}
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: number | `${number}%` }) {
  const { colors } = useAppTheme();
  return <View accessibilityLabel="Cargando contenido" style={{ height, width, borderRadius: Radii.small, backgroundColor: colors.surfaceSelected }} />;
}

export function ScreenHeader({ title, subtitle, accessory }: { title: string; subtitle?: string; accessory?: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {accessory}
    </View>
  );
}

export function Toast({ visible, message, onDismiss }: { visible: boolean; message: string; onDismiss: () => void }) {
  const { colors } = useAppTheme();
  if (!visible) return null;
  return (
    <Pressable accessibilityRole="alert" accessibilityLabel={message} onPress={onDismiss} style={[styles.toast, { backgroundColor: colors.text }]}>
      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      <Text style={[styles.toastText, { color: colors.surface }]}>{message}</Text>
      <Text style={[styles.toastDismiss, { color: colors.surface }]}>Cerrar</Text>
    </Pressable>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', destructive = false, loading = false, onConfirm, onCancel }: {
  visible: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string;
  destructive?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogBackdrop}>
        <View accessibilityRole="alert" style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <Text style={[styles.dialogTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>{message}</Text>
          <View style={styles.dialogActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} style={[styles.dialogButton, { borderColor: colors.border }]} onPress={onCancel} disabled={loading}><Text style={{ color: colors.text }}>{cancelLabel}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} style={[styles.dialogButton, { backgroundColor: destructive ? colors.error : colors.primary, borderColor: destructive ? colors.error : colors.primary }]} onPress={onConfirm} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={{ color: colors.surface, fontWeight: '700' }}>{confirmLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function useToastState() {
  const [message, setMessage] = useState('');
  return { message, showToast: setMessage, dismissToast: () => setMessage('') };
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radii.large, padding: Spacing.four, ...Elevation.low },
  listItem: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderWidth: 1, borderRadius: Radii.medium },
  listItemCopy: { flex: 1, minWidth: 0 },
  listItemTitle: { ...Typography.bodyStrong },
  listItemSubtitle: { ...Typography.caption, marginTop: Spacing.one },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.caption, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: Radii.pill, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  badgeText: { ...Typography.caption, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: Spacing.six, gap: Spacing.two },
  emptyIcon: { width: 48, height: 48, borderRadius: Radii.large, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...Typography.h2, textAlign: 'center' },
  emptyMessage: { ...Typography.body, textAlign: 'center', maxWidth: 320 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, marginBottom: Spacing.four },
  headerCopy: { flex: 1 },
  headerTitle: { ...Typography.h1 },
  headerSubtitle: { ...Typography.body, marginTop: Spacing.one },
  toast: { position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: Spacing.four, minHeight: 52, borderRadius: Radii.medium, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, ...Elevation.medium },
  toastText: { flex: 1, ...Typography.bodyStrong },
  toastDismiss: { ...Typography.caption, fontWeight: '700' },
  dialogBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, backgroundColor: 'rgba(11, 22, 16, 0.58)' },
  dialog: { borderRadius: Radii.large, padding: Spacing.five, ...Elevation.medium },
  dialogTitle: { ...Typography.h2 },
  dialogMessage: { ...Typography.body, marginTop: Spacing.two },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.five },
  dialogButton: { minHeight: 44, minWidth: 96, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium, alignItems: 'center', justifyContent: 'center' },
});