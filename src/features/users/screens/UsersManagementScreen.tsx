import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { UserFormModal } from "@/features/users/components/UserFormModal";
import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usersService } from "@/features/users/services/usersService";
import { colors } from "@/theme/colors";
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

const PAGE_SIZE = 10;

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
    `${user.fname ?? ""} ${user.lname ?? ""}`.trim() ||
    user.username ||
    "Usuario sin nombre"
  );
}

export function UsersManagementScreen() {
  const { hasPermission } = useAuth();
  const canCreateUsers = hasPermission(PERMISSIONS.CREATE_USERS);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [catalogs, setCatalogs] = useState<UserCatalogs>(emptyCatalogs);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
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

  const [statusTarget, setStatusTarget] = useState<SystemUser | null>(null);
  const [statusError, setStatusError] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  const loadUsers = useCallback(async () => {
    setListError("");
    try {
      setUsers(await usersService.getUsers());
    } catch (error) {
      setListError(
        getRequestMessage(
          error,
          "No se pudieron cargar los usuarios. Intenta nuevamente.",
        ),
      );
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
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

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      await Promise.all([loadUsers(), loadCatalogs()]);
      if (isMounted) {
        setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [loadCatalogs, loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return users;
    }
    return users.filter((user) =>
      `${user.fname ?? ""} ${user.mname ?? ""} ${user.lname ?? ""} ${user.federaltaxid ?? ""} ${user.username}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE,
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(), loadCatalogs()]);
    setRefreshing(false);
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

  const changeStatus = async () => {
    if (!statusTarget) {
      return;
    }
    const user = statusTarget;
    const nextActive = !isEnabled(user.active);
    setChangingStatus(true);
    setStatusError("");
    try {
      await usersService.updateUserStatus(user.id, nextActive);
      setUsers((current) =>
        current.map((entry) =>
          entry.id === user.id ? { ...entry, active: nextActive } : entry,
        ),
      );
      setStatusTarget(null);
    } catch (error) {
      setStatusError(
        getRequestMessage(error, "No se pudo cambiar el estado del usuario."),
      );
    } finally {
      setChangingStatus(false);
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
      <FlatList
        data={visibleUsers}
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
            <ModuleBanner
              title="Usuarios del sistema"
              subtitle="Administra cuentas, datos y estado de acceso."
              icon="people-outline"
            />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.createButton,
                !canCreateUsers && styles.disabledButton,
                pressed && canCreateUsers && styles.pressed,
              ]}
              onPress={openCreate}
              disabled={!canCreateUsers}
            >
              <Ionicons name="person-add-outline" size={19} color="#fff" />
              <Text style={styles.createButtonText}>Agregar usuario</Text>
            </Pressable>
            {!canCreateUsers ? (
              <Text style={styles.permissionHint}>
                Tu cuenta puede consultar y cambiar estados, pero no tiene
                permiso para crear o editar.
              </Text>
            ) : null}
            {catalogLoading ? (
              <View style={styles.catalogNotice}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.catalogNoticeText}>
                  Cargando grupos y catálogos…
                </Text>
              </View>
            ) : null}
            {catalogError ? (
              <View style={styles.catalogWarning}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color="#92400e"
                />
                <Text style={styles.catalogWarningText}>{catalogError}</Text>
              </View>
            ) : null}
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                accessibilityLabel="Buscar por nombre, RUT o usuario"
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Buscar nombre, RUT o usuario"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                returnKeyType="search"
                style={styles.searchInput}
              />
              {search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  onPress={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.countText}>
                {filteredUsers.length}{" "}
                {filteredUsers.length === 1 ? "usuario" : "usuarios"}
              </Text>
              <Text style={styles.pageText}>
                Página {visiblePage} de {totalPages}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={search ? "search-outline" : "people-outline"}
              size={36}
              color="#94a3b8"
            />
            <Text style={styles.stateTitle}>
              {search ? "Sin resultados" : "Aún no hay usuarios"}
            </Text>
            <Text style={styles.stateBody}>
              {search
                ? "Prueba con otro nombre, RUT o username."
                : "Los usuarios aparecerán aquí cuando estén disponibles."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const active = isEnabled(item.active);
          const authorized = isEnabled(item.authorized);
          return (
            <View style={styles.userCard}>
              <View style={[styles.avatar, !active && styles.avatarInactive]}>
                <Text style={styles.avatarText}>
                  {(
                    item.fname?.[0] ??
                    item.username?.[0] ??
                    "U"
                  ).toLocaleUpperCase()}
                  {item.lname?.[0]?.toLocaleUpperCase() ?? ""}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName(item)}
                </Text>
                <Text style={styles.username} numberOfLines={1}>
                  @{item.username}
                </Text>
                <View style={styles.userMetaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>
                      {item.federaltaxid || "Sin RUT"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.metaPill,
                      authorized
                        ? styles.authorizedPill
                        : styles.notAuthorizedPill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.metaPillText,
                        authorized ? styles.authorizedText : null,
                      ]}
                    >
                      {authorized ? "Autorizado" : "No autorizado"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${active ? "Desactivar" : "Activar"} ${item.username}`}
                  style={[
                    styles.statusAction,
                    active ? styles.activeAction : styles.inactiveAction,
                  ]}
                  onPress={() => {
                    setStatusTarget(item);
                    setStatusError("");
                  }}
                >
                  <Ionicons
                    name={active ? "power-outline" : "power"}
                    size={17}
                    color={active ? "#047857" : colors.textSecondary}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${item.username}`}
                  style={[
                    styles.editAction,
                    !canCreateUsers && styles.editActionDisabled,
                  ]}
                  onPress={() => void openEdit(item)}
                  disabled={!canCreateUsers}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={canCreateUsers ? colors.primaryDark : "#94a3b8"}
                  />
                </Pressable>
              </View>
              <View
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
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.pageButton,
                  visiblePage <= 1 && styles.pageButtonDisabled,
                ]}
                disabled={visiblePage <= 1}
                onPress={() => setPage(Math.max(1, visiblePage - 1))}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={visiblePage <= 1 ? "#94a3b8" : colors.primaryDark}
                />
                <Text
                  style={[
                    styles.pageButtonText,
                    visiblePage <= 1 && styles.pageButtonTextDisabled,
                  ]}
                >
                  Anterior
                </Text>
              </Pressable>
              <Text style={styles.paginationText}>
                {visiblePage} / {totalPages}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.pageButton,
                  visiblePage >= totalPages && styles.pageButtonDisabled,
                ]}
                disabled={visiblePage >= totalPages}
                onPress={() => setPage(Math.min(totalPages, visiblePage + 1))}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    visiblePage >= totalPages && styles.pageButtonTextDisabled,
                  ]}
                >
                  Siguiente
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    visiblePage >= totalPages ? "#94a3b8" : colors.primaryDark
                  }
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.footerSpace} />
          )
        }
      />

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
        onRetryCatalogs={() => void loadCatalogs()}
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
                color={isEnabled(statusTarget?.active) ? "#b91c1c" : "#047857"}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {isEnabled(statusTarget?.active)
                ? "Desactivar usuario"
                : "Activar usuario"}
            </Text>
            <Text style={styles.confirmText}>
              ¿Confirmas{" "}
              {isEnabled(statusTarget?.active) ? "desactivar" : "activar"} a{" "}
              <Text style={styles.confirmUserName}>
                {statusTarget ? displayName(statusTarget) : ""}
              </Text>{" "}
              (@{statusTarget?.username})?
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
                onPress={() => void changeStatus()}
                disabled={changingStatus}
              >
                {changingStatus ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmStatusText}>
                    {isEnabled(statusTarget?.active)
                      ? "Sí, desactivar"
                      : "Sí, activar"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  hero: {
    flexDirection: "row",
    alignItems: "center",
    padding: 17,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: "#0b5e93",
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
    backgroundColor: "#059669",
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
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 43,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 15,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
    marginRight: 11,
  },
  avatarInactive: { backgroundColor: "#e2e8f0" },
  avatarText: { color: colors.primaryDark, fontSize: 14, fontWeight: "800" },
  userDetails: { flex: 1, minWidth: 0 },
  userName: { color: colors.text, fontSize: 15, fontWeight: "800" },
  username: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  userMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: "#f1f5f9",
  },
  metaPillText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  authorizedPill: { backgroundColor: "#ecfdf5" },
  notAuthorizedPill: { backgroundColor: "#f1f5f9" },
  authorizedText: { color: "#047857" },
  cardActions: { flexDirection: "row", gap: 7, marginLeft: 6 },
  statusAction: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 11,
  },
  activeAction: { borderColor: "#bbf7d0", backgroundColor: "#ecfdf5" },
  inactiveAction: { borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  editAction: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 11,
    backgroundColor: "#eff6ff",
  },
  editActionDisabled: { borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  statusBadge: {
    position: "absolute",
    left: 70,
    bottom: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 15,
  },
  activeBadge: { backgroundColor: "#ecfdf5" },
  inactiveBadge: { backgroundColor: "#f1f5f9" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  activeDot: { backgroundColor: "#059669" },
  inactiveDot: { backgroundColor: "#94a3b8" },
  statusText: { fontSize: 11, fontWeight: "700" },
  activeStatusText: { color: "#047857" },
  inactiveStatusText: { color: "#475569" },
  emptyState: { alignItems: "center", paddingTop: 46, paddingHorizontal: 24 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: colors.background,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
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
  confirmActivate: { backgroundColor: "#d1fae5" },
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
  positiveConfirm: { backgroundColor: "#059669" },
  confirmStatusText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
