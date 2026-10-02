import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AccessDeniedScreen } from '@/components/auth/AccessDeniedScreen';
import { ActionButton } from '@/components/ui/ActionButton';
import { ModuleBanner } from '@/components/ui/ModuleBanner';
import { PERMISSIONS } from '@/constants/permissions';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
    rolePermissionsService,
    type GroupedPermissions,
    type PermissionGroup,
} from '@/features/role-permissions/services/rolePermissionsService';
import { useAppTheme } from '@/hooks/use-app-theme';

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function flattenPermissionIds(permissions: GroupedPermissions): number[] {
  return Object.values(permissions).flatMap((items) =>
    items.map((permission) => permission.id),
  );
}

export function RolePermissionsScreen() {
  const { hasPermission } = useAuth();
  const { colors } = useAppTheme();
  const canView = hasPermission(PERMISSIONS.VIEW_PERMISSION_MAINTAINER);
  const canUpdate = hasPermission(PERMISSIONS.UPDATE_PERMISSION_MAINTAINER);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [groupedPermissions, setGroupedPermissions] =
    useState<GroupedPermissions>({});
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [savedPermissionIds, setSavedPermissionIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [isGroupReady, setIsGroupReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    const [nextGroups, nextPermissions] = await Promise.all([
      rolePermissionsService.getGroups(),
      rolePermissionsService.getGroupedPermissions(),
    ]);
    const firstGroup = nextGroups[0] ?? null;
    const nextSelectedIds = firstGroup
      ? await rolePermissionsService.getGroupPermissionIds(firstGroup.id)
      : [];

    return {
      groups: nextGroups,
      permissions: nextPermissions,
      selectedGroup: firstGroup,
      selectedIds: nextSelectedIds,
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (canView) {
      void loadData()
        .then((result) => {
          if (!isMounted) {
            return;
          }
          setGroups(result.groups);
          setGroupedPermissions(result.permissions);
          setSelectedGroup(result.selectedGroup);
          setSelectedPermissionIds(result.selectedIds);
          setSavedPermissionIds(result.selectedIds);
          setIsGroupReady(Boolean(result.selectedGroup));
        })
        .catch((error: unknown) => {
          if (isMounted) {
            setErrorMessage(
              errorText(error, 'No se pudieron cargar los grupos y permisos.'),
            );
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
      requestId.current += 1;
    };
  }, [canView, loadData]);

  const permissionSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return Object.entries(groupedPermissions)
      .map(([moduleName, permissions]) => ({
        moduleName,
        permissions: permissions.filter((permission) =>
          `${moduleName} ${permission.name} ${permission.code} ${permission.description ?? ''}`
            .toLocaleLowerCase()
            .includes(query),
        ),
      }))
      .filter((section) => section.permissions.length > 0);
  }, [groupedPermissions, search]);

  const visibleGroups = useMemo(() => {
    const query = groupSearch.trim().toLocaleLowerCase();
    return groups.filter((group) =>
      `${group.name} ${group.id}`.toLocaleLowerCase().includes(query),
    );
  }, [groups, groupSearch]);

  const selectedSet = useMemo(
    () => new Set(selectedPermissionIds),
    [selectedPermissionIds],
  );
  const hasChanges = useMemo(() => {
    const selected = [...selectedPermissionIds].sort((left, right) => left - right);
    const saved = [...savedPermissionIds].sort((left, right) => left - right);
    return selected.length !== saved.length || selected.some((id, index) => id !== saved[index]);
  }, [savedPermissionIds, selectedPermissionIds]);
  const availablePermissionCount = useMemo(
    () => flattenPermissionIds(groupedPermissions).length,
    [groupedPermissions],
  );

  const refresh = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setNotice('');
    try {
      const result = await loadData();
      setGroups(result.groups);
      setGroupedPermissions(result.permissions);
      setSelectedGroup(result.selectedGroup);
      setSelectedPermissionIds(result.selectedIds);
      setSavedPermissionIds(result.selectedIds);
      setIsGroupReady(Boolean(result.selectedGroup));
    } catch (error) {
      setIsGroupReady(false);
      setErrorMessage(errorText(error, 'No se pudieron cargar los grupos y permisos.'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectGroup = async (group: PermissionGroup) => {
    const currentRequestId = ++requestId.current;
    setSelectedGroup(group);
    setGroupPickerVisible(false);
    setIsLoadingGroup(true);
    setIsGroupReady(false);
    setErrorMessage('');
    setNotice('');

    try {
      const ids = await rolePermissionsService.getGroupPermissionIds(group.id);
      if (currentRequestId === requestId.current) {
        setSelectedPermissionIds(ids);
        setSavedPermissionIds(ids);
        setIsGroupReady(true);
      }
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setErrorMessage(errorText(error, 'No se pudieron cargar los permisos del grupo.'));
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setIsLoadingGroup(false);
      }
    }
  };

  const togglePermission = (permissionId: number, enabled: boolean) => {
    if (!canUpdate || isSaving) {
      return;
    }
    setNotice('');
    setSelectedPermissionIds((current) =>
      enabled
        ? [...new Set([...current, permissionId])]
        : current.filter((id) => id !== permissionId),
    );
  };

  const savePermissions = async () => {
    if (!canUpdate || !selectedGroup || !isGroupReady || !hasChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setNotice('');
    try {
      await rolePermissionsService.updateGroupPermissions(
        selectedGroup.id,
        selectedPermissionIds,
      );
      setSavedPermissionIds(selectedPermissionIds);
      setNotice(`Permisos de ${selectedGroup.name} guardados.`);
    } catch (error) {
      setErrorMessage(errorText(error, 'No se pudieron guardar los permisos.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!canView) {
    return (
      <AccessDeniedScreen description="No tienes permiso para consultar los permisos por grupo." />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />
        }
      >
        <ModuleBanner
          title="Roles y permisos"
          subtitle="Consulta y asigna permisos a cada grupo de usuarios."
          icon="shield-checkmark-outline"
        />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>GRUPO</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selectedGroup ? `Grupo ${selectedGroup.name}` : 'Seleccionar grupo'}
          onPress={() => setGroupPickerVisible(true)}
          disabled={isLoading || groups.length === 0}
          style={({ pressed }) => [
            styles.groupPicker,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.groupPickerCopy}>
            <Text style={[styles.groupName, { color: colors.text }]}>
              {selectedGroup?.name ?? (isLoading ? 'Cargando grupos...' : 'Sin grupos disponibles')}
            </Text>
            {selectedGroup ? (
              <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>ID {selectedGroup.id}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>

        {!canUpdate ? (
          <View style={[styles.readOnlyNotice, { backgroundColor: colors.infoBackground }]}>
            <Ionicons name="eye-outline" size={18} color={colors.info} />
            <Text style={[styles.readOnlyText, { color: colors.info }]}>Acceso de solo lectura</Text>
          </View>
        ) : null}

        <View style={styles.permissionHeading}>
          <View style={styles.permissionHeadingCopy}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Permisos</Text>
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
              {selectedPermissionIds.length} de {availablePermissionCount} asignados
            </Text>
          </View>
          {isLoadingGroup ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            accessibilityLabel="Buscar permisos"
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por módulo, nombre o código"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={19} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {errorMessage ? (
          <View style={[styles.message, { backgroundColor: colors.errorBackground }]}>
            <Text style={[styles.messageText, { color: colors.error }]}>{errorMessage}</Text>
            <Pressable accessibilityRole="button" onPress={() => void refresh()}>
              <Text style={[styles.retryText, { color: colors.error }]}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}
        {notice ? (
          <View style={[styles.message, { backgroundColor: colors.successBackground }]}>
            <Text style={[styles.messageText, { color: colors.success }]}>{notice}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Cargando grupos y permisos...</Text>
          </View>
        ) : permissionSections.length ? (
          permissionSections.map((section) => (
            <View key={section.moduleName} style={styles.moduleSection}>
              <View style={[styles.moduleHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.moduleTitle, { color: colors.primaryStrong }]}>{section.moduleName}</Text>
                <Text style={[styles.moduleCount, { color: colors.textSecondary }]}>{section.permissions.length}</Text>
              </View>
              {section.permissions.map((permission) => {
                const selected = selectedSet.has(permission.id);
                return (
                  <View key={permission.id} style={[styles.permissionRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.permissionCopy}>
                      <Text style={[styles.permissionName, { color: colors.text }]}>{permission.name}</Text>
                      <Text style={[styles.permissionCode, { color: colors.textSecondary }]}>{permission.code}</Text>
                      {permission.description ? (
                        <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>{permission.description}</Text>
                      ) : null}
                    </View>
                    <Switch
                      accessibilityLabel={`${selected ? 'Retirar' : 'Asignar'} ${permission.name}`}
                      value={selected}
                      onValueChange={(enabled) => togglePermission(permission.id, enabled)}
                      disabled={!canUpdate || isLoadingGroup || !isGroupReady || isSaving || !selectedGroup}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Ionicons name="shield-outline" size={28} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sin permisos disponibles</Text>
            <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>No se encontraron permisos para mostrar.</Text>
          </View>
        )}
      </ScrollView>

      {canUpdate ? (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <ActionButton
            action="save"
            fullWidth
            onPress={() => void savePermissions()}
            disabled={!selectedGroup || !isGroupReady || !hasChanges || isSaving || isLoadingGroup || isLoading}
          />
        </View>
      ) : null}

      <Modal
        visible={groupPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.groupModal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Seleccionar grupo</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setGroupPickerVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                accessibilityLabel="Buscar grupo"
                value={groupSearch}
                onChangeText={setGroupSearch}
                placeholder="Buscar grupo"
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {visibleGroups.map((group) => {
                const isSelected = group.id === selectedGroup?.id;
                return (
                  <Pressable
                    key={group.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar ${group.name}`}
                    onPress={() => void selectGroup(group)}
                    style={({ pressed }) => [
                      styles.groupOption,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.surfaceSelected },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.groupPickerCopy}>
                      <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                      <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>ID {group.id}</Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.four, paddingBottom: Spacing.five },
  sectionLabel: { ...Typography.caption, fontWeight: '700', marginBottom: Spacing.two },
  groupPicker: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium },
  groupPickerCopy: { flex: 1, minWidth: 0 },
  groupName: { ...Typography.bodyStrong },
  groupMeta: { ...Typography.caption, marginTop: Spacing.one },
  readOnlyNotice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, marginTop: Spacing.three, borderRadius: Radii.small },
  readOnlyText: { ...Typography.caption, fontWeight: '700' },
  permissionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.five, marginBottom: Spacing.three },
  permissionHeadingCopy: { flex: 1 },
  sectionTitle: { ...Typography.h2 },
  sectionCaption: { ...Typography.caption, marginTop: Spacing.one },
  searchBox: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium, marginBottom: Spacing.three },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, ...Typography.body },
  message: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, padding: Spacing.three, marginBottom: Spacing.three, borderRadius: Radii.small },
  messageText: { flex: 1, ...Typography.caption },
  retryText: { ...Typography.caption, fontWeight: '700' },
  loadingState: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.six },
  moduleSection: { marginTop: Spacing.three },
  moduleHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  moduleTitle: { ...Typography.bodyStrong },
  moduleCount: { ...Typography.caption },
  permissionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  permissionCopy: { flex: 1, minWidth: 0 },
  permissionName: { ...Typography.bodyStrong },
  permissionCode: { ...Typography.caption, marginTop: Spacing.one },
  permissionDescription: { ...Typography.caption, marginTop: Spacing.one },
  emptyState: { alignItems: 'center', gap: Spacing.two, padding: Spacing.five, marginTop: Spacing.four, borderWidth: 1, borderRadius: Radii.medium },
  footer: { padding: Spacing.three, borderTopWidth: 1 },
  pressed: { opacity: 0.82 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.48)' },
  groupModal: { maxHeight: '85%', padding: Spacing.four, borderTopLeftRadius: Radii.large, borderTopRightRadius: Radii.large },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  groupOption: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
});