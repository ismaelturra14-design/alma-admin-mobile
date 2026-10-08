import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { PaginatedList } from "@/components/ui/PaginatedList";
import { PERMISSIONS } from "@/constants/permissions";
import { PAGE_SIZE } from "@/constants/theme";
import { useAuth } from "@/features/auth/context/AuthContext";
import { UserDetailScreen } from "@/features/users/components/UserDetailScreen";
import { UserFormModal } from "@/features/users/components/UserFormModal";
import { usersService } from "@/features/users/services/usersService";
import type {
    SystemUser,
    UserCatalogs,
    UserFormValues,
} from "@/features/users/types/users";
import {
    validateUserForm,
    type UserFormErrors,
    type UserFormField,
    type UserFormMode,
} from "@/features/users/utils/userValidation";
import { colors } from "@/theme/colors";

const emptyCatalogs: UserCatalogs = {
  groups: [],
  facilities: [],
  specialties: [],
  regions: [],
  communes: [],
};

function createEmptyForm(): UserFormValues {
  return {
    username: "",
    stiltskin: "",
    repeatPassword: "",
    federaltaxid: "",
    fname: "",
    mname: "",
    lname: "",
    birthday: "",
    email: "",
    user_group: "",
    specialty: "",
    phonecell: "",
    street: "",
    state: "",
    city: "",
    erxrole: "",
    edad_i: "",
    info: "",
    authorized: false,
    foto_url: "",
    firma_url: "",
    foto: null,
    firma: null,
    facility_id: [],
    especialidades: [],
  };
}

function isEnabled(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function toFormValues(user: SystemUser): UserFormValues {
  return {
    ...createEmptyForm(),
    username: user.username ?? "",
    federaltaxid: user.federaltaxid ?? "",
    fname: user.fname ?? "",
    mname: user.mname ?? "",
    lname: user.lname ?? "",
    birthday: user.birthday ? String(user.birthday).slice(0, 10) : "",
    email: user.email ?? "",
    user_group: user.user_group == null ? "" : String(user.user_group),
    specialty: user.specialty ?? "",
    phonecell: user.phonecell ?? "",
    street: user.street ?? "",
    state: user.state == null ? "" : String(user.state),
    city: user.city == null ? "" : String(user.city),
    erxrole: user.erxrole ?? "",
    edad_i: user.edad_i == null ? "" : String(user.edad_i),
    info: user.info ?? "",
    authorized: isEnabled(user.authorized),
    foto_url: user.foto_url ?? user.foto ?? "",
    firma_url: user.firma_url ?? user.firma ?? "",
    facility_id: Array.isArray(user.facility_id)
      ? user.facility_id.map(String)
      : [],
    especialidades: Array.isArray(user.especialidades)
      ? user.especialidades.map(String)
      : [],
  };
}

function getRequestMessage(error: unknown, fallback: string): string {
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
          return message.map(String).join("\n");
        }
      }
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function displayName(user: SystemUser): string {
  return (
    `${user.fname ?? ""} ${user.mname ?? ""} ${user.lname ?? ""}`.trim() ||
    user.username ||
    "Usuario sin nombre"
  );
}

type UserFilter =
  | "all"
  | "active"
  | "inactive"
  | "authorized"
  | "unauthorized";

const userFilters: { id: UserFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activos" },
  { id: "inactive", label: "Inactivos" },
  { id: "authorized", label: "Autorizados" },
  { id: "unauthorized", label: "No autorizados" },
];

function normalizedSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export function UsersManagementScreen() {
  const { hasPermission } = useAuth();
  const canCreateUsers = hasPermission(PERMISSIONS.CREATE_USERS);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [photoRefreshToken, setPhotoRefreshToken] = useState(0);
  const [catalogs, setCatalogs] = useState<UserCatalogs>(emptyCatalogs);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listFetching, setListFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverPaginated, setServerPaginated] = useState(false);
  const [listError, setListError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<UserFormMode>("create");
  const [form, setForm] = useState<UserFormValues>(createEmptyForm);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  const [statusTarget, setStatusTarget] = useState<SystemUser | null>(null);
  const [statusError, setStatusError] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [menuTarget, setMenuTarget] = useState<SystemUser | null>(null);
  const [pendingUndo, setPendingUndo] = useState<{
    userId: number;
    previousActive: boolean;
    nextActive: boolean;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const result = await usersService.getUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        status:
          userFilter === "active"
            ? "active"
            : userFilter === "inactive"
              ? "inactive"
              : "all",
        authorized:
          userFilter === "authorized"
            ? "authorized"
            : userFilter === "unauthorized"
              ? "unauthorized"
              : "all",
        hasRut: null,
      });
      setListError("");
      setUsers(result.users);
      setServerTotal(result.total);
      setServerPaginated(result.serverPaginated);
      setPhotoRefreshToken((current) => current + 1);
    } catch (error) {
      setListError(
        getRequestMessage(
          error,
          "No se pudieron cargar los usuarios. Intenta nuevamente.",
        ),
      );
    }
  }, [debouncedSearch, page, userFilter]);

  const loadCatalogs = useCallback(async () => {
    try {
      const result = await usersService.getCatalogs();
      setCatalogs(result.catalogs);
      setCatalogError(
        result.failed.length
          ? `No se pudieron cargar: ${result.failed.join(", ")}. Desliza hacia abajo para reintentar.`
          : "",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const reloadCatalogs = () => {
    setCatalogLoading(true);
    return loadCatalogs();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== debouncedSearch) {
        setListFetching(true);
        setDebouncedSearch(search);
        setPage(1);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [debouncedSearch, search]);

  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      void loadUsers().finally(() => {
        if (isMounted) {
          setLoading(false);
          setListFetching(false);
        }
      });
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [loadUsers]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (!pendingUndo) {
      return;
    }
    const timeout = setTimeout(() => setPendingUndo(null), 5000);
    return () => clearTimeout(timeout);
  }, [pendingUndo]);

  const filteredUsers = useMemo(() => {
    const query = normalizedSearch(serverPaginated ? debouncedSearch : search);
    return users.filter((user) => {
      const active = isEnabled(user.active);
      const authorized = isEnabled(user.authorized);
      const matchesQuery =
        !query ||
        normalizedSearch(
          `${user.fname ?? ""} ${user.mname ?? ""} ${user.lname ?? ""} ${user.federaltaxid ?? ""} ${user.username}`,
        ).includes(query);
      const matchesFilter =
        userFilter === "all" ||
        (userFilter === "active" && active) ||
        (userFilter === "inactive" && !active) ||
        (userFilter === "authorized" && authorized) ||
        (userFilter === "unauthorized" && !authorized);
      return matchesQuery && matchesFilter;
    });
  }, [debouncedSearch, search, serverPaginated, userFilter, users]);

  const displayedUsers = filteredUsers;
  const totalItems = serverPaginated ? serverTotal : filteredUsers.length;
  const refresh = async () => {
    setRefreshing(true);
    setListFetching(true);
    await Promise.all([loadUsers(), reloadCatalogs()]).finally(() => {
      setRefreshing(false);
      setListFetching(false);
    });
  };

  const openCreate = () => {
    if (!canCreateUsers) {
      return;
    }
    setFormMode("create");
    setEditingId(null);
    setForm(createEmptyForm());
    setFormErrors({});
    setFormMessage("");
    setLoadingDetail(false);
    setDetailError("");
    setFormVisible(true);
  };

  const openEdit = async (user: SystemUser) => {
    if (!canCreateUsers) {
      return;
    }
    setFormMode("edit");
    setEditingId(user.id);
    setForm(toFormValues(user));
    setFormErrors({});
    setFormMessage("");
    setDetailError("");
    setLoadingDetail(true);
    setFormVisible(true);

    try {
      const detail = await usersService.getUser(user.id);
      setForm(toFormValues(detail));
    } catch (error) {
      setDetailError(
        getRequestMessage(error, "No se pudo cargar el detalle del usuario."),
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const retryUserDetail = () => {
    const user = users.find((item) => item.id === editingId);
    if (user) {
      void openEdit(user);
    }
  };

  const closeForm = () => {
    if (saving) {
      return;
    }
    setFormVisible(false);
    setEditingId(null);
    setFormMessage("");
    setFormErrors({});
  };

  const handleFieldChange = (
    field: UserFormField,
    value: UserFormValues[UserFormField],
  ) => {
    setForm((current) => ({ ...current, [field]: value }) as UserFormValues);
    setFormErrors((current) => ({ ...current, [field]: undefined }));
    setFormMessage("");
    if (field === "state") {
      setForm((current) => ({ ...current, state: value as string, city: "" }));
      setFormErrors((current) => ({ ...current, city: undefined }));
    }
    if (field === "stiltskin" || field === "repeatPassword") {
      setFormErrors((current) => ({ ...current, repeatPassword: undefined }));
    }
  };

  const submitForm = async () => {
    if (!canCreateUsers) {
      setFormMessage("No tienes permiso para crear o editar usuarios.");
      return;
    }
    const errors = validateUserForm(form, formMode);
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      setFormMessage("Revisa los campos marcados antes de continuar.");
      return;
    }
    if (formMode === "edit" && editingId === null) {
      setFormMessage(
        "No se pudo identificar el usuario que deseas actualizar.",
      );
      return;
    }

    setSaving(true);
    setFormMessage("");
    try {
      if (formMode === "create") {
        await usersService.createUser(form);
      } else {
        await usersService.updateUser(editingId as number, form);
      }
      setFormVisible(false);
      setEditingId(null);
      await loadUsers();
    } catch (error) {
      setFormMessage(
        getRequestMessage(
          error,
          formMode === "create"
            ? "Error al crear usuario."
            : "Error al actualizar usuario.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const changeUserStatus = async (user: SystemUser, nextActive: boolean) => {
    if (!canCreateUsers) {
      return;
    }
    setChangingStatus(true);
    setStatusError("");
    try {
      await usersService.updateUserStatus(user.id, nextActive);
      setUsers((current) =>
        current.map((entry) =>
          entry.id === user.id ? { ...entry, active: nextActive } : entry,
        ),
      );
      if (serverPaginated && (userFilter === "active" || userFilter === "inactive")) {
        const matchesStatusFilter = (active: boolean) =>
          userFilter === "active" ? active : !active;
        setServerTotal((current) =>
          Math.max(
            0,
            current +
              Number(matchesStatusFilter(nextActive)) -
              Number(matchesStatusFilter(isEnabled(user.active))),
          ),
        );
      }
      setPendingUndo({
        userId: user.id,
        previousActive: !nextActive,
        nextActive,
      });
      setStatusTarget(null);
    } catch (error) {
      const message = getRequestMessage(
        error,
        "No se pudo cambiar el estado del usuario.",
      );
      if (statusTarget?.id === user.id) {
        setStatusError(message);
      } else {
        setListError(message);
      }
    } finally {
      setChangingStatus(false);
    }
  };

  const changeStatus = () => {
    if (statusTarget) {
      void changeUserStatus(statusTarget, !isEnabled(statusTarget.active));
    }
  };

  const undoStatusChange = async () => {
    if (!pendingUndo || !canCreateUsers) {
      return;
    }
    const undo = pendingUndo;
    setPendingUndo(null);
    try {
      await usersService.updateUserStatus(undo.userId, undo.previousActive);
      setUsers((current) =>
        current.map((user) =>
          user.id === undo.userId
            ? { ...user, active: undo.previousActive }
            : user,
        ),
      );
      if (serverPaginated && (userFilter === "active" || userFilter === "inactive")) {
        const matchesStatusFilter = (active: boolean) =>
          userFilter === "active" ? active : !active;
        setServerTotal((current) =>
          Math.max(
            0,
            current +
              Number(matchesStatusFilter(undo.previousActive)) -
              Number(matchesStatusFilter(undo.nextActive)),
          ),
        );
      }
    } catch (error) {
      setListError(
        getRequestMessage(error, "No se pudo deshacer el cambio de estado."),
      );
    }
  };

  const selectMenuAction = (action: "edit" | "status") => {
    if (!menuTarget) {
      return;
    }
    const user = menuTarget;
    setMenuTarget(null);
    if (action === "edit") {
      void openEdit(user);
    } else if (isEnabled(user.active)) {
      setStatusTarget(user);
      setStatusError("");
    } else {
      void changeUserStatus(user, true);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>Cargando usuarios…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {listError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color="#b91c1c" />
          <Text style={styles.errorText}>{listError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadUsers()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      <PaginatedList
        data={displayedUsers}
        mode={serverPaginated ? "server" : "client"}
        page={page}
        totalItems={totalItems}
        onPageChange={(nextPage) => {
          setListFetching(true);
          setPage(nextPage);
        }}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons
                  name="search-outline"
                  size={19}
                  color={colors.textSecondary}
                />
                <TextInput
                  accessibilityLabel="Buscar por nombre, RUT o usuario"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar nombre, RUT o usuario"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {listFetching ? (
                  <ActivityIndicator
                    accessibilityLabel="Buscando usuarios"
                    size="small"
                    color={colors.primary}
                  />
                ) : null}
                {search ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar búsqueda"
                    onPress={() => setSearch("")}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar usuario"
                style={({ pressed }) => [
                  styles.addButton,
                  !canCreateUsers && styles.disabledButton,
                  pressed && canCreateUsers && styles.pressed,
                ]}
                onPress={openCreate}
                disabled={!canCreateUsers}
              >
                <Ionicons name="add" size={25} color="#fff" />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {userFilters.map((filter) => {
                const selected = filter.id === userFilter;
                return (
                  <Pressable
                    key={filter.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (!selected) {
                        setListFetching(true);
                        setUserFilter(filter.id);
                        setPage(1);
                      }
                    }}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {catalogLoading || catalogError ? (
              <View style={styles.catalogNotice}>
                {catalogLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name="alert-circle-outline"
                    size={17}
                    color="#92400e"
                  />
                )}
                <Text style={styles.catalogNoticeText}>
                  {catalogLoading
                    ? "Cargando catálogos…"
                    : catalogError}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={34} color="#64748b" />
            <Text style={styles.stateTitle}>
              No encontramos usuarios con esos filtros
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const active = isEnabled(item.active);
          const authorized = isEnabled(item.authorized);
          return (
            <View
              style={[
                styles.userCard,
                !active && styles.userCardInactive,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver detalle de ${displayName(item)}`}
                style={({ pressed }) => [
                  styles.userCardMain,
                  pressed && styles.userCardPressed,
                ]}
                onPress={() => setSelectedUser(item)}
              >
                <View
                  style={[styles.avatar, !active && styles.avatarInactive]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      !active && styles.avatarTextInactive,
                    ]}
                  >
                    {(item.fname?.[0] ?? item.username?.[0] ?? "U")
                      .toLocaleUpperCase()}
                    {item.lname?.[0]?.toLocaleUpperCase() ?? ""}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text
                    style={[
                      styles.userName,
                      !active && styles.userNameInactive,
                    ]}
                    numberOfLines={2}
                  >
                    {displayName(item)}
                  </Text>
                  <Text
                    style={[
                      styles.userData,
                      !active && styles.userDataInactive,
                    ]}
                    numberOfLines={1}
                  >
                    @{item.username} ·{" "}
                    {item.federaltaxid?.trim() || (
                      <Text style={styles.noRutData}>Sin RUT</Text>
                    )}
                  </Text>
                  <View
                    style={[
                      styles.authorizationChip,
                      authorized
                        ? styles.authorizedChip
                        : styles.notAuthorizedChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.authorizationText,
                        authorized
                          ? styles.authorizedText
                          : styles.notAuthorizedText,
                      ]}
                    >
                      {authorized ? "Autorizado" : "No autorizado"}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalle de ${displayName(item)}`}
                  onPress={() => setSelectedUser(item)}
                  style={[
                    styles.statusBadge,
                    active ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      active ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      active
                        ? styles.activeStatusText
                        : styles.inactiveStatusText,
                    ]}
                  >
                    {active ? "Activo" : "Inactivo"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Más acciones para ${displayName(item)}`}
                  style={styles.menuButton}
                  onPress={() => setMenuTarget(item)}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {pendingUndo ? (
        <View style={styles.undoBanner}>
          <Text style={styles.undoText}>
            Usuario {pendingUndo.nextActive ? "reactivado" : "desactivado"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void undoStatusChange()}
            style={styles.undoButton}
          >
            <Text style={styles.undoButtonText}>Deshacer</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={menuTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuTarget(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
          style={styles.sheetBackdrop}
          onPress={() => setMenuTarget(null)}
        >
          <Pressable style={styles.actionSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {menuTarget ? displayName(menuTarget) : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.sheetAction}
              onPress={() => selectMenuAction("edit")}
              disabled={!canCreateUsers}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text
                style={[
                  styles.sheetActionText,
                  !canCreateUsers && styles.sheetActionDisabled,
                ]}
              >
                Editar usuario
              </Text>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable
              accessibilityRole="button"
              style={styles.sheetAction}
              onPress={() => selectMenuAction("status")}
              disabled={changingStatus || !canCreateUsers}
            >
              <Ionicons
                name={
                  isEnabled(menuTarget?.active)
                    ? "person-remove-outline"
                    : "person-add-outline"
                }
                size={20}
                color={
                  isEnabled(menuTarget?.active) ? "#b42318" : colors.primary
                }
              />
              <Text
                style={[
                  styles.sheetActionText,
                  isEnabled(menuTarget?.active) && styles.destructiveActionText,
                ]}
              >
                {isEnabled(menuTarget?.active)
                  ? "Desactivar usuario"
                  : "Reactivar usuario"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <UserFormModal
        visible={formVisible}
        mode={formMode}
        form={form}
        catalogs={catalogs}
        errors={formErrors}
        saving={saving}
        formMessage={formMessage}
        catalogMessage={catalogError}
        catalogLoading={catalogLoading}
        loadingDetail={loadingDetail}
        detailError={detailError}
        onChange={handleFieldChange}
        onClose={closeForm}
        onSubmit={() => void submitForm()}
        onRetryDetail={retryUserDetail}
        onRetryCatalogs={() => void reloadCatalogs()}
      />

      <Modal
        visible={statusTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusTarget(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View
              style={[
                styles.confirmIcon,
                isEnabled(statusTarget?.active)
                  ? styles.confirmDeactivate
                  : styles.confirmActivate,
              ]}
            >
              <Ionicons
                name={
                  isEnabled(statusTarget?.active)
                    ? "pause-circle-outline"
                    : "checkmark-circle-outline"
                }
                size={26}
                color={isEnabled(statusTarget?.active) ? colors.error : colors.success}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {isEnabled(statusTarget?.active)
                ? "Desactivar usuario"
                : "Activar usuario"}
            </Text>
            <Text style={styles.confirmText}>
              ¿Desactivar a{" "}
              <Text style={styles.confirmUserName}>
                {statusTarget ? ` ${displayName(statusTarget)}` : ""}
              </Text>
              ? No podrá iniciar sesión hasta que lo reactives.
            </Text>
            {statusError ? (
              <Text accessibilityRole="alert" style={styles.statusError}>
                {statusError}
              </Text>
            ) : null}
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.cancelStatusButton}
                onPress={() => setStatusTarget(null)}
                disabled={changingStatus}
              >
                <Text style={styles.cancelStatusText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmStatusButton,
                  isEnabled(statusTarget?.active)
                    ? styles.destructiveConfirm
                    : styles.positiveConfirm,
                ]}
                onPress={changeStatus}
                disabled={changingStatus || !canCreateUsers}
              >
                {changingStatus ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmStatusText}>
                    Desactivar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {selectedUser ? (
        <UserDetailScreen
          user={selectedUser}
          catalogs={catalogs}
          photoRefreshToken={photoRefreshToken}
          onBack={() => setSelectedUser(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 25,
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearSearchButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#2F6B94",
  },
  filterRow: { gap: 8, paddingVertical: 12, paddingRight: 4 },
  filterChip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#a8bac8",
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  filterChipSelected: { borderColor: "#2F6B94", backgroundColor: "#2F6B94" },
  filterChipText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  filterChipTextSelected: { color: "#fff" },
  undoBanner: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#d7e2eb",
    backgroundColor: "#f1f8fc",
  },
  undoText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  undoButton: {
    minWidth: 72,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  undoButtonText: { color: "#245675", fontSize: 14, fontWeight: "700" },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  actionSheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#fff",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    alignSelf: "center",
    marginBottom: 14,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sheetAction: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  sheetActionText: { color: "#243746", fontSize: 15, fontWeight: "600" },
  sheetActionDisabled: { color: "#64748b" },
  sheetDivider: { height: 1, backgroundColor: "#e2e8f0" },
  destructiveActionText: { color: "#9f1d17" },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    marginRight: 13,
  },
  heroCopy: { flex: 1 },
  eyebrow: {
    color: "#bfdbfe",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#dbeafe", fontSize: 12, marginTop: 4, lineHeight: 17 },
  createButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginBottom: 12,
  },
  createButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  disabledButton: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  permissionHint: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 12,
  },
  catalogNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 9,
  },
  catalogNoticeText: { color: colors.textSecondary, fontSize: 12 },
  catalogWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginBottom: 11,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fffbeb",
  },
  catalogWarningText: {
    flex: 1,
    color: "#92400e",
    fontSize: 11,
    lineHeight: 16,
  },
  searchBox: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    marginBottom: 8,
  },
  countText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  pageText: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dce4ea",
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  userCardInactive: {
    borderLeftWidth: 3,
    borderLeftColor: "#d67a7a",
    backgroundColor: "#f5f6f7",
  },
  userCardMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
  },
  userCardPressed: { opacity: 0.84 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dceefa",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImage: { ...StyleSheet.absoluteFill },
  avatarInactive: { backgroundColor: "#e2e5e8" },
  avatarText: { color: "#245675", fontSize: 14, fontWeight: "700" },
  avatarTextInactive: { color: "#52606d" },
  userDetails: { flex: 1, minWidth: 0 },
  userName: { color: "#243746", fontSize: 16, fontWeight: "600" },
  userNameInactive: { color: "#52606d" },
  userData: {
    color: "#52606d",
    fontSize: 13,
    marginTop: 2,
  },
  userDataInactive: { color: "#5d6872" },
  noRutData: { color: "#64748b" },
  authorizationChip: {
    alignSelf: "flex-start",
    minHeight: 20,
    justifyContent: "center",
    marginTop: 4,
    paddingHorizontal: 7,
    borderRadius: 10,
  },
  authorizedChip: { backgroundColor: "#dceefa" },
  notAuthorizedChip: { backgroundColor: "#e8ecef" },
  authorizationText: { fontSize: 11, fontWeight: "600" },
  authorizedText: { color: "#174d70" },
  notAuthorizedText: { color: "#475569" },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 15,
  },
  activeBadge: { backgroundColor: "#dcf3e5" },
  inactiveBadge: { backgroundColor: "#fde9e8" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  activeDot: { backgroundColor: "#27804a" },
  inactiveDot: { backgroundColor: "#bd3d36" },
  statusText: { fontSize: 12, fontWeight: "700" },
  activeStatusText: { color: "#1f663c" },
  inactiveStatusText: { color: "#8f2924" },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: colors.background,
  },
  stateTitle: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 6,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fef2f2",
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
  },
  errorText: { flex: 1, color: "#b91c1c", fontSize: 12, lineHeight: 17 },
  retryText: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 15,
    paddingBottom: 8,
  },
  pageButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: colors.card,
  },
  pageButtonDisabled: { backgroundColor: "#f8fafc" },
  pageButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  pageButtonTextDisabled: { color: "#94a3b8" },
  paginationText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  footerSpace: { height: 16 },
  confirmBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  confirmCard: { padding: 22, borderRadius: 20, backgroundColor: colors.card },
  confirmIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    marginBottom: 13,
  },
  confirmDeactivate: { backgroundColor: "#fee2e2" },
  confirmActivate: { backgroundColor: colors.successBackground },
  confirmTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  confirmText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  confirmUserName: { color: colors.text, fontWeight: "800" },
  statusError: {
    color: "#b91c1c",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  cancelStatusButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#f1f5f9",
  },
  cancelStatusText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  confirmStatusButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  destructiveConfirm: { backgroundColor: colors.error },
  positiveConfirm: { backgroundColor: colors.primary },
  confirmStatusText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
