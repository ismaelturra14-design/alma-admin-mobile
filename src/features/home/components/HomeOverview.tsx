import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { auditService } from '@/features/audit/services/auditService';
import type { AuditRecord } from '@/features/audit/types/audit';
import type { UserData } from '@/features/auth/types/auth';
import { groupMaintenanceService } from '@/features/group-maintenance/services/groupMaintenanceService';
import { usersService } from '@/features/users/services/usersService';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { DrawerMenuSection } from '@/navigation/menuConfig';

type HomeOverviewProps = {
  user: UserData | null;
  menuSections: DrawerMenuSection[];
  onSelectModule: (route: string) => void;
};

type RequestResult<T> = {
  value: T | null;
  failed: boolean;
};

async function requestResult<T>(request: () => Promise<T>): Promise<RequestResult<T>> {
  try {
    return { value: await request(), failed: false };
  } catch {
    return { value: null, failed: true };
  }
}

function formatAuditDate(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatAuditLabel(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es-CL')
    .replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('es-CL'));
}

function formatAuditAction(value: string): string {
  const labels: Record<string, string> = {
    CREATE: 'Creación',
    INSERT: 'Creación',
    UPDATE: 'Actualización',
    EDIT: 'Edición',
    DELETE: 'Eliminación',
    REMOVE: 'Eliminación',
    GRANT: 'Permiso asignado',
    REVOKE: 'Permiso retirado',
  };
  return labels[value.toLocaleUpperCase('es-CL')] ?? formatAuditLabel(value);
}

function isKnownAuditUser(value: string): boolean {
  return Boolean(value.trim()) && value !== 'Usuario desconocido';
}

export function HomeOverview({ user, menuSections, onSelectModule }: HomeOverviewProps) {
  const { colors } = useAppTheme();
  const isMounted = useRef(true);
  const [userTotal, setUserTotal] = useState<number | null>(null);
  const [groupTotal, setGroupTotal] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditRecord[] | null>(null);
  const [userLoadFailed, setUserLoadFailed] = useState(false);
  const [groupLoadFailed, setGroupLoadFailed] = useState(false);
  const [auditLoadFailed, setAuditLoadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const availableRoutes = useMemo(
    () => new Set(menuSections.flatMap((section) => section.items.map((item) => item.route))),
    [menuSections],
  );
  const canViewUsers = availableRoutes.has('UsuariosDelSistema');
  const canViewGroups = availableRoutes.has('MantenedorGrupos');
  const canViewAudit = availableRoutes.has('AuditoriaPermisos');

  const shortcuts = useMemo(
    () =>
      menuSections
        .flatMap((section) => section.items)
        .filter((item) => item.route !== 'Inicio' && !item.underDevelopment)
        .slice(0, 4),
    [menuSections],
  );

  const loadDashboardData = useCallback(async () => {
    const [usersResult, groupsResult, auditResult] = await Promise.all([
      canViewUsers
        ? requestResult(() =>
            usersService.getUsers({
              page: 1,
              limit: 1,
              search: '',
              status: 'all',
              authorized: 'all',
              hasRut: null,
            }),
          )
        : Promise.resolve(null),
      canViewGroups
        ? requestResult(() => groupMaintenanceService.getGroups())
        : Promise.resolve(null),
      canViewAudit
        ? requestResult(() =>
            auditService.getAuditPage({ page: 1, limit: 4, sortOrder: 'DESC' }),
          )
        : Promise.resolve(null),
    ]);

    if (isMounted.current) {
      const verifiedTotal =
        usersResult?.value?.serverPaginated &&
        Number.isInteger(usersResult.value.total) &&
        usersResult.value.total >= 0
          ? usersResult.value.total
          : null;
      setUserTotal(verifiedTotal);
      setGroupTotal(groupsResult?.value?.length ?? null);
      setRecentActivity(auditResult?.value?.data ?? null);
      setUserLoadFailed(usersResult?.failed ?? false);
      setGroupLoadFailed(groupsResult?.failed ?? false);
      setAuditLoadFailed(auditResult?.failed ?? false);
      setIsLoading(false);
    }
  }, [canViewAudit, canViewGroups, canViewUsers]);

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    if (isMounted.current) {
      setIsRefreshing(false);
    }
  }, [loadDashboardData]);

  useEffect(() => {
    isMounted.current = true;
    void loadDashboardData();
    return () => {
      isMounted.current = false;
    };
  }, [loadDashboardData]);

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
  const metricSourceAvailable = canViewUsers || canViewGroups;
  const showUserMetric =
    canViewUsers && (userTotal !== null || userLoadFailed || isLoading);
  const showGroupMetric =
    canViewGroups && (groupTotal !== null || groupLoadFailed || isLoading);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refreshDashboard()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={[styles.welcome, { backgroundColor: colors.primarySoft }]}>
        <View style={styles.welcomeCopy}>
          <Text style={[styles.date, { color: colors.primary }]}>{formattedDate}</Text>
          <Text style={[styles.title, { color: colors.primaryStrong }]}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Resumen de administración
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar resumen"
          accessibilityHint="Vuelve a cargar las métricas y la actividad reciente."
          disabled={isLoading || isRefreshing}
          onPress={() => void refreshDashboard()}
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
            (isLoading || isRefreshing) && styles.disabled,
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={19} color={colors.primary} accessible={false} />
          )}
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen</Text>
        <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
          Datos disponibles para tu cuenta
        </Text>
      </View>

      {showUserMetric || showGroupMetric ? (
        <View style={styles.metrics}>
          {showUserMetric ? (
            <MetricCard
              icon="people-outline"
              label="Usuarios del sistema"
              value={userTotal === null ? null : String(userTotal)}
              loading={isLoading && userTotal === null && !userLoadFailed}
              failed={userLoadFailed}
            />
          ) : null}
          {showGroupMetric ? (
            <MetricCard
              icon="git-network-outline"
              label="Grupos de usuarios"
              value={groupTotal === null ? null : String(groupTotal)}
              loading={isLoading && groupTotal === null && !groupLoadFailed}
              failed={groupLoadFailed}
            />
          ) : null}
        </View>
      ) : !metricSourceAvailable ? (
        <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            No hay métricas administrativas disponibles para tu cuenta.
          </Text>
        </View>
      ) : !isLoading ? (
        <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            No se recibieron totales verificables para mostrar.
          </Text>
        </View>
      ) : null}

      {canViewAudit ? (
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Actividad reciente</Text>
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
              Últimos cambios registrados
            </Text>
          </View>

          {isLoading && recentActivity === null && !auditLoadFailed ? (
            <View style={[styles.activityState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                Cargando actividad…
              </Text>
            </View>
          ) : auditLoadFailed ? (
            <View style={[styles.activityState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                No se pudo cargar la actividad. Intenta actualizar el resumen.
              </Text>
            </View>
          ) : recentActivity?.length ? (
            <View style={[styles.activityList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {recentActivity.map((record, index) => {
                const module = record.module.trim() && record.module !== '—'
                  ? formatAuditLabel(record.module)
                  : null;
                const action = record.action_type.trim() && record.action_type !== '—'
                  ? formatAuditAction(record.action_type)
                  : null;
                const title = [action, module].filter(Boolean).join(' · ') || 'Actividad registrada';
                const date = formatAuditDate(record.created_at);

                return (
                  <View
                    key={record.id}
                    style={[
                      styles.activityRow,
                      index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="time-outline" size={17} color={colors.primary} accessible={false} />
                    </View>
                    <View style={styles.activityCopy}>
                      <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={2}>
                        {title}
                      </Text>
                      {isKnownAuditUser(record.user_name) ? (
                        <Text style={[styles.activityMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {record.user_name}
                        </Text>
                      ) : null}
                      {date ? (
                        <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>
                          {date}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.activityState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                No hay actividad reciente disponible.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.shortcutSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accesos rápidos</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
            Módulos disponibles para tu cuenta
          </Text>
        </View>

        {shortcuts.length ? shortcuts.map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={`Abre el módulo ${item.label}.`}
            onPress={() => onSelectModule(item.route)}
            style={({ pressed }) => [
              styles.shortcut,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.pressed,
              index > 0 && styles.shortcutSpacing,
            ]}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={19}
                color={colors.primary}
                accessible={false}
              />
            </View>
            <Text style={[styles.shortcutLabel, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.muted} accessible={false} />
          </Pressable>
        )) : (
          <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              No hay módulos disponibles para esta cuenta.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

type MetricCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
  loading: boolean;
  failed: boolean;
};

function MetricCard({ icon, label, value, loading, failed }: MetricCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityLabel={`${label}: ${loading ? 'cargando' : failed ? 'no disponible' : value ?? 'no disponible'}`}
      style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.metricIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={19} color={colors.primary} accessible={false} />
      </View>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.metricLoading} />
      ) : failed ? (
        <Text style={[styles.metricUnavailable, { color: colors.textSecondary }]}>
          No disponible
        </Text>
      ) : (
        <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      )}
      {failed ? (
        <Text style={[styles.metricHint, { color: colors.textSecondary }]}>
          Intenta actualizar
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: Spacing.seven, gap: Spacing.two },
  welcome: {
    borderRadius: Radii.large,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  welcomeCopy: { flex: 1 },
  date: { ...Typography.caption, textTransform: 'capitalize' },
  title: { ...Typography.h2, marginTop: Spacing.two },
  subtitle: { ...Typography.caption, marginTop: Spacing.one },
  refreshButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  sectionHeader: { marginBottom: Spacing.two },
  sectionTitle: { ...Typography.h2 },
  sectionCaption: { ...Typography.caption, marginTop: Spacing.one },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  metricCard: {
    flex: 1,
    minWidth: 140,
    minHeight: 154,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.three,
  },
  metricIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.small,
  },
  metricLabel: { ...Typography.caption, marginTop: Spacing.three },
  metricValue: { fontSize: 30, lineHeight: 38, fontWeight: '700', marginTop: Spacing.one },
  metricUnavailable: { ...Typography.bodyStrong, marginTop: Spacing.two },
  metricHint: { ...Typography.caption, marginTop: Spacing.one },
  metricLoading: { alignSelf: 'flex-start', marginTop: Spacing.three },
  notice: { borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.four },
  noticeText: { ...Typography.body, textAlign: 'center' },
  activitySection: { marginTop: Spacing.four },
  activityList: { borderWidth: 1, borderRadius: Radii.medium, overflow: 'hidden' },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.three },
  activityIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  activityCopy: { flex: 1 },
  activityTitle: { ...Typography.bodyStrong },
  activityMeta: { ...Typography.caption, marginTop: Spacing.one },
  activityState: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.four,
  },
  stateText: { ...Typography.body, textAlign: 'center' },
  shortcutSection: { marginTop: Spacing.four },
  shortcut: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.medium,
  },
  shortcutSpacing: { marginTop: Spacing.two },
  shortcutIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.small,
  },
  shortcutLabel: { flex: 1, ...Typography.bodyStrong },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.85 },
  disabled: { opacity: 0.7 },
});
