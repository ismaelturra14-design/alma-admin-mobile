import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { PAGE_SIZE } from "@/constants/theme";
import {
  getManagedUserGroupId,
  groupMaintenanceService,
  type ManagedGroup,
  type ManagedUser,
} from "@/features/group-maintenance/services/groupMaintenanceService";
import { useAppTheme } from "@/hooks/use-app-theme";

const PAGE_SIZES = [10, 25, 50, 100];

function requestErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response
    ) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data) {
        const message = data.message;
        if (typeof message === "string" && message.trim()) {
          return message;
        }
        if (Array.isArray(message)) {
          return message.filter((item) => typeof item === "string").join(" ");
        }
      }
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function fullName(user: ManagedUser): string {
  return [user.fname, user.mname, user.lname]
    .filter((part): part is string => typeof part === "string" && !!part.trim())
    .join(" ");
}

function userDisplayName(user: ManagedUser): string {
  return fullName(user) || user.username || `Usuario ${user.id}`;
}

function normalizedSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

function userSearchText(user: ManagedUser): string {
  return [
    userDisplayName(user),
    user.username,
    user.email,
    user.federaltaxid,
    user.info,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

function SearchField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.searchField,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.searchInput, { color: colors.text }]}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Limpiar ${label.toLocaleLowerCase()}`}
          hitSlop={8}
          onPress={() => onChangeText("")}
        >
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function InlineMessage({
  message,
  kind = "error",
  onDismiss,
}: {
  message: string;
  kind?: "error" | "success" | "info";
  onDismiss?: () => void;
}) {
  const { colors } = useAppTheme();
  const palette =
    kind === "error"
      ? {
          background: colors.errorBackground,
          border: colors.error,
          text: colors.error,
          icon: "alert-circle-outline" as const,
        }
      : kind === "success"
        ? {
            background: colors.successBackground,
            border: colors.success,
            text: colors.success,
            icon: "checkmark-circle-outline" as const,
          }
        : {
            background: colors.infoBackground,
            border: colors.border,
            text: colors.info,
            icon: "information-circle-outline" as const,
          };

  return (
    <View
      style={[
        styles.message,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <Ionicons name={palette.icon} size={19} color={palette.text} />
      <Text style={[styles.messageText, { color: palette.text }]}>{message}</Text>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar mensaje"
          hitSlop={8}
          onPress={onDismiss}
        >
          <Ionicons name="close" size={18} color={palette.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PageControls({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { colors } = useAppTheme();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const first = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, totalItems);

  return (
    <View style={styles.pagination}>
      <View style={styles.pageSizeOptions}>
        {PAGE_SIZES.map((size) => {
          const selected = size === pageSize;
          return (
            <Pressable
              key={size}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${size} por página`}
              style={[
                styles.pageSizeOption,
                {
                  backgroundColor: selected ? colors.surfaceSelected : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onPageSizeChange(size)}
            >
              <Text
                style={[
                  styles.pageSizeText,
                  { color: selected ? colors.primary : colors.textSecondary },
                ]}
              >
                {size}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.pageNavigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Página anterior"
          disabled={currentPage <= 1}
          style={[
            styles.pageButton,
            { borderColor: colors.border },
            currentPage <= 1 && styles.disabled,
          ]}
          onPress={() => onPageChange(currentPage - 1)}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={currentPage <= 1 ? colors.muted : colors.primary}
          />
        </Pressable>
        <Text style={[styles.pageSummary, { color: colors.textSecondary }]}>
          {`${first}–${last} de ${totalItems}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Página siguiente"
          disabled={currentPage >= totalPages}
          style={[
            styles.pageButton,
            { borderColor: colors.border },
            currentPage >= totalPages && styles.disabled,
          ]}
          onPress={() => onPageChange(currentPage + 1)}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={currentPage >= totalPages ? colors.muted : colors.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function GroupMaintenanceScreen() {
  const { colors } = useAppTheme();
  const [groups, setGroups] = useState<ManagedGroup[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userCounts, setUserCounts] = useState<Record<number, number>>({});
  const [selectedGroup, setSelectedGroup] = useState<ManagedGroup | null>(null);
  const [groupUsers, setGroupUsers] = useState<ManagedUser[]>([]);
  const [view, setView] = useState<"list" | "detail">("list");
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersLoadFailed, setMembersLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [countWarning, setCountWarning] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalGroup, setEditModalGroup] = useState<ManagedGroup | null>(
    null,
  );
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(
    new Set(),
  );

  const loadData = useCallback(async () => {
    const [nextGroups, nextUsers] = await Promise.all([
      groupMaintenanceService.getGroups(),
      groupMaintenanceService.getUsers(),
    ]);
    const countResults = await Promise.allSettled(
      nextGroups.map((group) =>
        groupMaintenanceService.getUsersByGroup(group.id),
      ),
    );
    const hasCountFailures = countResults.some(
      (result) => result.status === "rejected",
    );
    const nextCounts: Record<number, number> = {};
    nextGroups.forEach((group, index) => {
      const result = countResults[index];
      nextCounts[group.id] =
        result?.status === "fulfilled"
          ? result.value.length
          : nextUsers.filter(
              (user) => getManagedUserGroupId(user) === group.id,
            ).length;
    });
    setGroups(nextGroups);
    setUsers(nextUsers);
    setUserCounts(nextCounts);
    setCountWarning(
      hasCountFailures
        ? "No se pudieron consultar todos los conteos; los grupos afectados muestran un cálculo basado en el listado de usuarios."
        : "",
    );
    setLoadError("");
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await loadData();
      } catch (error) {
        if (active) {
          setLoadError(
            requestErrorMessage(
              error,
              "No se pudieron cargar los grupos y usuarios.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void loadInitialData();
    return () => {
      active = false;
    };
  }, [loadData]);

  const filteredGroups = useMemo(() => {
    const query = normalizedSearch(groupSearch);
    if (!query) {
      return groups;
    }
    return groups.filter((group) =>
      normalizedSearch(
        `${group.name} ${group.description ?? `Grupo ${group.name}`}`,
      ).includes(query),
    );
  }, [groups, groupSearch]);

  const filteredMembers = useMemo(() => {
    const query = normalizedSearch(memberSearch);
    return query
      ? groupUsers.filter((user) =>
          normalizedSearch(`${userDisplayName(user)} ${user.username}`).includes(
            query,
          ),
        )
      : groupUsers;
  }, [groupUsers, memberSearch]);

  const candidates = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }
    const query = normalizedSearch(candidateSearch);
    return users.filter(
      (user) =>
        getManagedUserGroupId(user) !== selectedGroup.id &&
        (!query || normalizedSearch(userSearchText(user)).includes(query)),
    );
  }, [candidateSearch, selectedGroup, users]);

  const visibleItemCount =
    view === "list" ? filteredGroups.length : filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(visibleItemCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageGroups = filteredGroups.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageMembers = filteredMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const refresh = async () => {
    setRefreshing(true);
    setActionError("");
    try {
      await loadData();
      if (view === "detail" && selectedGroup) {
        setGroupUsers(
          await groupMaintenanceService.getUsersByGroup(selectedGroup.id),
        );
        setMembersLoadFailed(false);
      }
    } catch (error) {
      setActionError(
        requestErrorMessage(error, "No se pudieron actualizar los datos."),
      );
    } finally {
      setRefreshing(false);
    }
  };

  const openGroup = async (group: ManagedGroup) => {
    setSelectedGroup(group);
    setView("detail");
    setPage(1);
    setMemberSearch("");
    setActionError("");
    setMembersLoadFailed(false);
    setLoadingMembers(true);
    try {
      setGroupUsers(await groupMaintenanceService.getUsersByGroup(group.id));
    } catch (error) {
      setGroupUsers([]);
      setMembersLoadFailed(true);
      setActionError(
        requestErrorMessage(
          error,
          "No se pudieron cargar los integrantes de este grupo.",
        ),
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  const returnToGroups = () => {
    setView("list");
    setSelectedGroup(null);
    setGroupUsers([]);
    setMemberSearch("");
    setActionError("");
    setMembersLoadFailed(false);
    setPage(1);
  };

  const openAddUsers = () => {
    setCandidateSearch("");
    setSelectedUserIds(new Set());
    setAddModalOpen(true);
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const refreshAfterMutation = async (groupId: number) => {
    await loadData();
    const nextMembers = await groupMaintenanceService.getUsersByGroup(groupId);
    setGroupUsers(nextMembers);
    setMembersLoadFailed(false);
  };

  const addUsers = async () => {
    if (!selectedGroup || selectedUserIds.size === 0) {
      return;
    }
    const selectedUsers = candidates.filter((user) =>
      selectedUserIds.has(user.id),
    );
    if (selectedUsers.length === 0) {
      setSelectedUserIds(new Set());
      return;
    }
    const updatedUserIds: number[] = [];
    setSaving(true);
    setActionError("");
    setNotice("");
    try {
      for (const user of selectedUsers) {
        await groupMaintenanceService.updateUserGroup(user, selectedGroup.id);
        updatedUserIds.push(user.id);
      }
    } catch (error) {
      let refreshError = "";
      const completedUsers = selectedUsers.filter((user) =>
        updatedUserIds.includes(user.id),
      );
      if (completedUsers.length > 0) {
        const completedIds = new Set(updatedUserIds);
        setUsers((current) =>
          current.map((user) =>
            completedIds.has(user.id)
              ? { ...user, user_group: selectedGroup.id }
              : user,
          ),
        );
        setGroupUsers((current) => [
          ...current.filter((user) => !completedIds.has(user.id)),
          ...completedUsers.map((user) => ({
            ...user,
            user_group: selectedGroup.id,
          })),
        ]);
        setUserCounts((current) => ({
          ...current,
          [selectedGroup.id]:
            (current[selectedGroup.id] ?? 0) + completedUsers.length,
        }));
      }
      try {
        await refreshAfterMutation(selectedGroup.id);
      } catch (refreshFailure) {
        refreshError = ` Además, no se pudo actualizar la lista: ${requestErrorMessage(refreshFailure, "error de actualización")}`;
      }
      const partialMessage =
        updatedUserIds.length > 0
          ? ` Se asignaron ${updatedUserIds.length} usuario${updatedUserIds.length === 1 ? "" : "s"} antes del error.`
          : "";
      if (updatedUserIds.length > 0) {
        const completedIds = new Set(updatedUserIds);
        setSelectedUserIds((current) =>
          new Set([...current].filter((id) => !completedIds.has(id))),
        );
      }
      setActionError(
        `${requestErrorMessage(error, "No se pudieron asignar los usuarios.")}${partialMessage}${refreshError}`,
      );
      setSaving(false);
      return;
    }

    setAddModalOpen(false);
    setSelectedUserIds(new Set());
    setUsers((current) =>
      current.map((user) =>
        selectedUserIds.has(user.id)
          ? { ...user, user_group: selectedGroup.id }
          : user,
      ),
    );
    setGroupUsers((current) => [
      ...current.filter((user) => !selectedUserIds.has(user.id)),
      ...selectedUsers.map((user) => ({
        ...user,
        user_group: selectedGroup.id,
      })),
    ]);
    setUserCounts((current) => ({
      ...current,
      [selectedGroup.id]:
        (current[selectedGroup.id] ?? 0) + updatedUserIds.length,
    }));
    setNotice(
      `${updatedUserIds.length} usuario${updatedUserIds.length === 1 ? "" : "s"} asignado${updatedUserIds.length === 1 ? "" : "s"} correctamente.`,
    );
    try {
      await refreshAfterMutation(selectedGroup.id);
    } catch (error) {
      setActionError(
        `Los usuarios fueron asignados, pero no se pudo actualizar la lista: ${requestErrorMessage(error, "error de actualización")}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    try {
      await loadData();
    } catch (error) {
      setLoadError(
        requestErrorMessage(
          error,
          "No se pudieron cargar los grupos y usuarios.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerState,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Cargando grupos y usuarios...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
      >
        {view === "detail" && selectedGroup ? (
          <Pressable
            accessibilityRole="button"
            style={styles.backButton}
            onPress={returnToGroups}
          >
            <Ionicons name="arrow-back" size={19} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              Volver a grupos
            </Text>
          </Pressable>
        ) : null}

        <ModuleBanner
          title={view === "detail" ? selectedGroup?.name ?? "Grupo" : "Mantenedor de grupos"}
          subtitle={
            view === "detail"
              ? selectedGroup?.description || `Grupo ${selectedGroup?.name ?? ""}`
              : "Consulta grupos y administra sus integrantes."
          }
          icon="people-outline"
          eyebrow="SISTEMA & HERRAMIENTAS"
        />

        {loadError ? (
          <View>
            <InlineMessage message={loadError} />
            <Pressable
              accessibilityRole="button"
              style={[
                styles.secondaryButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={() => void handleRetry()}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                Reintentar conexión
              </Text>
            </Pressable>
          </View>
        ) : null}
        {countWarning ? (
          <InlineMessage message={countWarning} kind="info" />
        ) : null}
        {actionError ? (
          <InlineMessage
            message={actionError}
            onDismiss={() => setActionError("")}
          />
        ) : null}
        {notice ? (
          <InlineMessage
            message={notice}
            kind="success"
            onDismiss={() => setNotice("")}
          />
        ) : null}

        {view === "list" ? (
          <>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionHeadingText}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Grupos
                </Text>
                <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
                  {filteredGroups.length}{" "}
                  {filteredGroups.length === 1 ? "grupo" : "grupos"}
                </Text>
              </View>
            </View>
            <SearchField
              label="Buscar grupos"
              value={groupSearch}
              placeholder="Buscar por nombre o descripción"
              onChangeText={(value) => {
                setGroupSearch(value);
                setPage(1);
              }}
            />
            {pageGroups.length ? (
              pageGroups.map((group) => (
                <View
                  key={group.id}
                  style={[
                    styles.groupCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.groupIcon,
                      { backgroundColor: colors.surfaceSelected },
                    ]}
                  >
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.groupDetails}>
                    <Text style={[styles.groupName, { color: colors.text }]}>
                      {group.name}
                    </Text>
                    <Text
                      style={[styles.groupDescription, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {group.description || `Grupo ${group.name}`}
                    </Text>
                    <Text style={[styles.groupMeta, { color: colors.textSecondary }]}>
                      ID {group.id} · {userCounts[group.id] ?? 0}{" "}
                      {(userCounts[group.id] ?? 0) === 1 ? "usuario" : "usuarios"}
                    </Text>
                  </View>
                  <View style={styles.groupActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${group.name}`}
                      style={styles.iconButton}
                      onPress={() => setEditModalGroup(group)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={colors.primary}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ver integrantes de ${group.name}`}
                      style={styles.iconButton}
                      onPress={() => void openGroup(group)}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={21}
                        color={colors.primary}
                      />
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Ionicons
                  name={groupSearch ? "search-outline" : "people-outline"}
                  size={27}
                  color={colors.muted}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {groupSearch ? "Sin resultados" : "Aún no hay grupos"}
                </Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  {groupSearch
                    ? "Prueba con otra búsqueda."
                    : "No hay grupos disponibles para mostrar."}
                </Text>
              </View>
            )}
            <PageControls
              page={currentPage}
              pageSize={pageSize}
              totalItems={filteredGroups.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        ) : (
          <>
            <View style={styles.detailSummary}>
              <View style={styles.sectionHeadingText}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Integrantes
                </Text>
                <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
                  {loadingMembers
                    ? "Cargando..."
                    : `${groupUsers.length} ${groupUsers.length === 1 ? "usuario" : "usuarios"}`}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={openAddUsers}
                disabled={saving}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Agregar</Text>
              </Pressable>
            </View>
            <SearchField
              label="Buscar integrantes"
              value={memberSearch}
              placeholder="Buscar por nombre o usuario"
              onChangeText={(value) => {
                setMemberSearch(value);
                setPage(1);
              }}
            />
            {loadingMembers ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                  Cargando integrantes...
                </Text>
              </View>
            ) : pageMembers.length ? (
              pageMembers.map((user) => (
                <View
                  key={user.id}
                  style={[
                    styles.userCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.surfaceSelected },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {userDisplayName(user).charAt(0).toLocaleUpperCase() || "U"}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: colors.text }]}>
                      {userDisplayName(user)}
                    </Text>
                    <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                      {user.username || `ID ${user.id}`}
                    </Text>
                    {typeof user.info === "string" && user.info.trim() ? (
                      <Text
                        style={[styles.userInfo, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {user.info}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Ionicons
                  name={
                    membersLoadFailed
                      ? "alert-circle-outline"
                      : memberSearch
                        ? "search-outline"
                        : "people-outline"
                  }
                  size={27}
                  color={colors.muted}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {membersLoadFailed
                    ? "No se pudieron cargar los usuarios"
                    : memberSearch
                      ? "Sin coincidencias"
                      : "Aún no hay usuarios"}
                </Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  {membersLoadFailed
                    ? "Desliza hacia abajo para volver a intentarlo."
                    : memberSearch
                      ? "Prueba con otro nombre o usuario."
                      : "Agrega usuarios para comenzar."}
                </Text>
              </View>
            )}
            <PageControls
              page={currentPage}
              pageSize={pageSize}
              totalItems={filteredMembers.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </ScrollView>

      <Modal
        visible={addModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !saving && setAddModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.addModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Agregar usuarios
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Se reasignarán al grupo {selectedGroup?.name ?? ""}.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar selección de usuarios"
                disabled={saving}
                onPress={() => setAddModalOpen(false)}
              >
                <Ionicons name="close" size={23} color={colors.textSecondary} />
              </Pressable>
            </View>
            <SearchField
              label="Buscar usuarios disponibles"
              value={candidateSearch}
              placeholder="Nombre, usuario, correo o identificador"
              onChangeText={setCandidateSearch}
            />
            <Text style={[styles.selectionCount, { color: colors.textSecondary }]}>
              {selectedUserIds.size} seleccionados · {candidates.length} disponibles
            </Text>
            <FlatList
              data={candidates}
              keyExtractor={(user) => String(user.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.candidateList}
              ListEmptyComponent={
                <Text style={[styles.emptyCandidates, { color: colors.textSecondary }]}>
                  {candidateSearch
                    ? "No hay usuarios que coincidan con la búsqueda."
                    : "No hay usuarios disponibles para asignar."}
                </Text>
              }
              renderItem={({ item: user }) => {
                const selected = selectedUserIds.has(user.id);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.candidateRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: selected
                          ? colors.surfaceSelected
                          : colors.surface,
                      },
                    ]}
                    onPress={() => toggleUserSelection(user.id)}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={22}
                      color={selected ? colors.primary : colors.muted}
                    />
                    <View style={styles.candidateDetails}>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {userDisplayName(user)}
                      </Text>
                      <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
                        {[user.username, user.email]
                          .filter(
                            (value): value is string =>
                              typeof value === "string" && !!value.trim(),
                          )
                          .join(" · ") || `ID ${user.id}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                disabled={saving}
                onPress={() => setAddModalOpen(false)}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  (saving || selectedUserIds.size === 0) && styles.disabled,
                ]}
                disabled={saving || selectedUserIds.size === 0}
                onPress={() => void addUsers()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Asignar ({selectedUserIds.size})
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!editModalGroup}
        animationType="fade"
        transparent
        onRequestClose={() => setEditModalGroup(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.confirmModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edición no disponible
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              El backend no dispone de endpoints para crear o editar grupos.
              No se realizarán cambios en “{editModalGroup?.name ?? ""}”.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, alignSelf: "flex-end" },
              ]}
              onPress={() => setEditModalGroup(null)}
            >
              <Text style={styles.primaryButtonText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { fontSize: 13, lineHeight: 19 },
  inlineLoading: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 10 },
  backButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  backButtonText: { fontSize: 14, fontWeight: "700" },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionHeadingText: { flex: 1 },
  sectionTitle: { fontSize: 19, lineHeight: 26, fontWeight: "800" },
  sectionCaption: { fontSize: 12, marginTop: 2 },
  searchField: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 9, fontSize: 14 },
  groupCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, marginBottom: 9, borderWidth: 1, borderRadius: 15 },
  groupIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  groupDetails: { flex: 1, minWidth: 0 },
  groupName: { fontSize: 15, fontWeight: "700" },
  groupDescription: { fontSize: 12, marginTop: 3 },
  groupMeta: { fontSize: 11, marginTop: 5 },
  groupActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  iconButton: { width: 40, height: 42, alignItems: "center", justifyContent: "center" },
  detailSummary: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  primaryButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 14, borderRadius: 11 },
  primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  userCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 12, marginBottom: 8, borderWidth: 1, borderRadius: 14 },
  avatar: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  avatarText: { fontSize: 16, fontWeight: "800" },
  userDetails: { flex: 1, minWidth: 0 },
  userName: { fontSize: 14, fontWeight: "700" },
  userMeta: { fontSize: 12, marginTop: 3 },
  userInfo: { fontSize: 11, marginTop: 4 },
  emptyState: { alignItems: "center", gap: 7, padding: 24, marginTop: 8, borderWidth: 1, borderRadius: 14, borderStyle: "dashed" },
  emptyTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyBody: { fontSize: 12, textAlign: "center" },
  pagination: { gap: 11, paddingTop: 13, marginTop: 7 },
  pageSizeOptions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  pageSizeOption: { minWidth: 42, minHeight: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 9 },
  pageSizeText: { fontSize: 12, fontWeight: "700" },
  pageNavigation: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  pageButton: { width: 42, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10 },
  pageSummary: { minWidth: 105, fontSize: 12, textAlign: "center" },
  disabled: { opacity: 0.45 },
  message: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, marginBottom: 10, borderWidth: 1, borderRadius: 12 },
  messageText: { flex: 1, fontSize: 12, lineHeight: 18 },
  secondaryButton: { minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginBottom: 11, borderWidth: 1, borderRadius: 10 },
  secondaryButtonText: { fontSize: 13, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.48)" },
  addModal: { maxHeight: "90%", padding: 16, borderWidth: 1, borderRadius: 18 },
  confirmModal: { gap: 14, padding: 20, borderWidth: 1, borderRadius: 18 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  modalTitleContainer: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  selectionCount: { fontSize: 12, marginBottom: 5 },
  candidateList: { maxHeight: 350, minHeight: 100 },
  emptyCandidates: { padding: 20, fontSize: 13, lineHeight: 19, textAlign: "center" },
  candidateRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  candidateDetails: { flex: 1, minWidth: 0 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 13 },
  confirmMessage: { fontSize: 14, lineHeight: 21 },
});
