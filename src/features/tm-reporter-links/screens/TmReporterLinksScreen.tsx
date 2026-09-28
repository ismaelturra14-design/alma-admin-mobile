import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { usersService } from "@/features/users/services/usersService";
import {
  tmReporterLinksService,
  type TmReporterLink,
} from "@/features/tm-reporter-links/services/tmReporterLinksService";
import { colors } from "@/theme/colors";
import type { SystemUser } from "@/features/users/types/users";

type PickerKind = "tm" | "reporter" | null;
type LinkForm = { tmId: number | null; reporterId: number | null };
type LinkRow = TmReporterLink & { tmLabel: string; reporterLabel: string };
const PAGE_SIZES = [10, 25, 50, 100];

function requestMessage(error: unknown, fallback: string): string {
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
        if (typeof message === "string" && message.trim()) return message;
        if (Array.isArray(message)) return message.map(String).join("\n");
      }
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function displayName(user: SystemUser): string {
  return (
    `${user.fname ?? ""} ${user.mname ?? ""} ${user.lname ?? ""}`.trim() ||
    user.username ||
    `Usuario ${user.id}`
  );
}

function createEmptyForm(): LinkForm {
  return { tmId: null, reporterId: null };
}

export function TmReporterLinksScreen() {
  const [links, setLinks] = useState<TmReporterLink[]>([]);
  const [tmUsers, setTmUsers] = useState<SystemUser[]>([]);
  const [reporterUsers, setReporterUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionIsError, setActionIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<TmReporterLink | null>(null);
  const [form, setForm] = useState<LinkForm>(createEmptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LinkRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [linkResult, tmResult, reporterResult] = await Promise.allSettled([
      tmReporterLinksService.getAll(),
      usersService.getUsersByGroup(18),
      usersService.getUsersByGroup(19),
    ]);
    const failures: string[] = [];
    if (linkResult.status === "fulfilled") setLinks(linkResult.value);
    else {
      failures.push(
        requestMessage(
          linkResult.reason,
          "No se pudieron cargar los vínculos. Intenta nuevamente.",
        ),
      );
    }
    if (tmResult.status === "fulfilled") setTmUsers(tmResult.value);
    else {
      failures.push(
        `TM-CARDIO: ${requestMessage(
          tmResult.reason,
          "No se pudieron cargar los profesionales.",
        )}`,
      );
    }
    if (reporterResult.status === "fulfilled") {
      setReporterUsers(reporterResult.value);
    } else {
      failures.push(
        `INFORMANTE: ${requestMessage(
          reporterResult.reason,
          "No se pudieron cargar los profesionales.",
        )}`,
      );
    }
    setLoadError(failures.join(" "));
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      const [linkResult, tmResult, reporterResult] = await Promise.allSettled([
        tmReporterLinksService.getAll(),
        usersService.getUsersByGroup(18),
        usersService.getUsersByGroup(19),
      ]);
      if (!mounted) return;
      const failures: string[] = [];
      if (linkResult.status === "fulfilled") setLinks(linkResult.value);
      else {
        failures.push(
          requestMessage(
            linkResult.reason,
            "No se pudieron cargar los vínculos. Intenta nuevamente.",
          ),
        );
      }
      if (tmResult.status === "fulfilled") setTmUsers(tmResult.value);
      else {
        failures.push(
          `TM-CARDIO: ${requestMessage(
            tmResult.reason,
            "No se pudieron cargar los profesionales.",
          )}`,
        );
      }
      if (reporterResult.status === "fulfilled") {
        setReporterUsers(reporterResult.value);
      } else {
        failures.push(
          `INFORMANTE: ${requestMessage(
            reporterResult.reason,
            "No se pudieron cargar los profesionales.",
          )}`,
        );
      }
      setLoadError(failures.join(" "));
      setLoading(false);
    };
    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo<LinkRow[]>(
    () =>
      links.map((link) => {
        const tm = tmUsers.find((user) => user.id === link.tm_id);
        const reporter = reporterUsers.find(
          (user) => user.id === link.reporter_id,
        );
        const tmName =
          link.tm_name || (tm ? displayName(tm) : `ID ${link.tm_id}`);
        const reporterName =
          link.reporter_name ||
          (reporter ? displayName(reporter) : `ID ${link.reporter_id}`);
        return {
          ...link,
          tmLabel: `${tmName}${link.tm_username || tm?.username ? ` (@${link.tm_username || tm?.username})` : ""}`,
          reporterLabel: `${reporterName}${link.reporter_username || reporter?.username ? ` (@${link.reporter_username || reporter?.username})` : ""}`,
        };
      }),
    [links, reporterUsers, tmUsers],
  );
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.tmLabel} ${row.reporterLabel} ${row.tm_username ?? ""} ${row.reporter_username ?? ""}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visiblePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );
  const pickerUsers = picker === "tm" ? tmUsers : reporterUsers;
  const pickerTitle = picker === "tm" ? "TM-CARDIO" : "INFORMANTE";
  const filteredPickerUsers = pickerUsers.filter((user) => {
    const query = pickerSearch.trim().toLocaleLowerCase();
    return (
      !query ||
      `${displayName(user)} ${user.username}`
        .toLocaleLowerCase()
        .includes(query)
    );
  });

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  const openCreate = () => {
    setEditing(null);
    setForm(createEmptyForm());
    setFormError("");
    setActionMessage("");
    setActionIsError(false);
    setFormVisible(true);
  };
  const openEdit = (link: TmReporterLink) => {
    setEditing(link);
    setForm({ tmId: link.tm_id, reporterId: link.reporter_id });
    setFormError("");
    setActionMessage("");
    setActionIsError(false);
    setFormVisible(true);
  };
  const submitForm = async () => {
    if (!form.tmId || !form.reporterId) {
      setFormError("Selecciona un profesional en ambos campos.");
      return;
    }
    setSaving(true);
    setFormError("");
    setActionMessage("");
    setActionIsError(false);
    try {
      const input = { tm_id: form.tmId, reporter_id: form.reporterId };
      if (editing) await tmReporterLinksService.update(editing.id, input);
      else await tmReporterLinksService.create(input);
      setFormVisible(false);
      setEditing(null);
      await loadData();
      setActionMessage(editing ? "Vínculo actualizado." : "Vínculo ingresado.");
    } catch (error) {
      setFormError(
        requestMessage(
          error,
          editing
            ? "No se pudo actualizar el vínculo."
            : "No se pudo ingresar el vínculo.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionMessage("");
    setActionIsError(false);
    try {
      await tmReporterLinksService.delete(deleteTarget.id);
      setLinks((current) =>
        current.filter((link) => link.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      setActionMessage("Vínculo eliminado.");
    } catch (error) {
      setActionMessage(
        requestMessage(error, "No se pudo eliminar el vínculo."),
      );
      setActionIsError(true);
    } finally {
      setDeleting(false);
    }
  };

  const selectedTm = tmUsers.find((user) => user.id === form.tmId);
  const selectedReporter = reporterUsers.find(
    (user) => user.id === form.reporterId,
  );
  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>Cargando vínculos…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleRows}
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
              title="Vínculos TM-Informante"
              subtitle="Administra las relaciones entre TM-CARDIO e informantes."
              icon="git-branch-outline"
            />
            {loadError ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color="#b91c1c"
                />
                <Text style={styles.errorText}>{loadError}</Text>
                <Pressable onPress={() => void loadData()}>
                  <Text style={styles.retryText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}
            {actionMessage ? (
              <Text
                accessibilityRole="alert"
                style={[styles.notice, actionIsError && styles.noticeError]}
              >
                {actionMessage}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.pressed,
              ]}
              onPress={openCreate}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Ingresar vínculo</Text>
            </Pressable>
            {formVisible ? (
              <View style={styles.formCard}>
                <View style={styles.formHeadingRow}>
                  <Text style={styles.formTitle}>
                    {editing ? "Editar vínculo" : "Nuevo vínculo"}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar formulario"
                    onPress={() => setFormVisible(false)}
                    disabled={saving}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
                <Text style={styles.fieldLabel}>TM-CARDIO</Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.selectButton}
                  onPress={() => {
                    setPicker("tm");
                    setPickerSearch("");
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.selectText,
                      !selectedTm && styles.placeholder,
                    ]}
                  >
                    {selectedTm
                      ? `${displayName(selectedTm)} (@${selectedTm.username})`
                      : "Buscar y seleccionar TM-CARDIO"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
                <Text style={styles.fieldLabel}>INFORMANTE</Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.selectButton}
                  onPress={() => {
                    setPicker("reporter");
                    setPickerSearch("");
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.selectText,
                      !selectedReporter && styles.placeholder,
                    ]}
                  >
                    {selectedReporter
                      ? `${displayName(selectedReporter)} (@${selectedReporter.username})`
                      : "Buscar y seleccionar informante"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {formError ? (
                  <Text accessibilityRole="alert" style={styles.formError}>
                    {formError}
                  </Text>
                ) : null}
                <View style={styles.formActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setFormVisible(false)}
                    disabled={saving}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.submitButton,
                      saving && styles.disabledButton,
                    ]}
                    onPress={() => void submitForm()}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : null}
                    <Text style={styles.submitText}>
                      {editing ? "Guardar" : "Ingresar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                accessibilityLabel="Buscar por nombre o usuario"
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre o usuario"
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
            <View style={styles.listControls}>
              <Text style={styles.countText}>
                {filteredRows.length}{" "}
                {filteredRows.length === 1 ? "vínculo" : "vínculos"}
              </Text>
              <View style={styles.pageSizeControl}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mostrar registros: ${pageSize}`}
                  accessibilityState={{ expanded: pageSizeMenuOpen }}
                  style={styles.pageSizePicker}
                  onPress={() => setPageSizeMenuOpen((open) => !open)}
                >
                  <Text style={styles.pageSizeLabel}>Mostrar registros</Text>
                  <Text style={styles.pageSizeText}>{pageSize}</Text>
                  <Ionicons
                    name={pageSizeMenuOpen ? "chevron-up" : "chevron-down"}
                    size={15}
                    color={colors.textSecondary}
                  />
                </Pressable>
                {pageSizeMenuOpen
                  ? PAGE_SIZES.map((size) => (
                      <Pressable
                        key={size}
                        accessibilityRole="button"
                        accessibilityState={{ selected: pageSize === size }}
                        style={[
                          styles.pageSizeOption,
                          pageSize === size && styles.pageSizeSelected,
                        ]}
                        onPress={() => {
                          setPageSize(size);
                          setPage(1);
                          setPageSizeMenuOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pageSizeText,
                            pageSize === size && styles.pageSizeTextSelected,
                          ]}
                        >
                          {size}
                        </Text>
                      </Pressable>
                    ))
                  : null}
              </View>
            </View>
            <Text style={styles.pageText}>
              Página {visiblePage} de {totalPages}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={search ? "search-outline" : "git-branch-outline"}
              size={36}
              color="#94a3b8"
            />
            <Text style={styles.emptyTitle}>
              {search ? "Sin resultados" : "Aún no hay vínculos"}
            </Text>
            <Text style={styles.stateBody}>
              {search
                ? "Prueba con otro nombre o usuario."
                : "Ingresa un vínculo para comenzar."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.linkCard}>
            <View style={styles.linkIcon}>
              <Ionicons
                name="people-outline"
                size={19}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.linkDetails}>
              <Text style={styles.personRole}>TM-CARDIO</Text>
              <Text style={styles.personName} numberOfLines={2}>
                {item.tmLabel}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.personRole}>INFORMANTE</Text>
              <Text style={styles.personName} numberOfLines={2}>
                {item.reporterLabel}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar vínculo"
                style={styles.editAction}
                onPress={() => openEdit(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={19}
                  color={colors.primaryDark}
                />
                <Text style={styles.editActionText}>Editar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Eliminar vínculo"
                style={styles.deleteAction}
                onPress={() => setDeleteTarget(item)}
              >
                <Ionicons name="trash-outline" size={19} color="#b91c1c" />
                <Text style={styles.deleteActionText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
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
        }
      />

      <Modal
        visible={picker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.formHeadingRow}>
              <Text style={styles.formTitle}>Seleccionar {pickerTitle}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={() => setPicker(null)}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.pickerSearch}>
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.textSecondary}
              />
              <TextInput
                autoFocus
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="Buscar por nombre o usuario"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                style={styles.searchInput}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.pickerList}
            >
              {filteredPickerUsers.length ? (
                filteredPickerUsers.map((user) => (
                  <Pressable
                    key={user.id}
                    style={styles.pickerOption}
                    onPress={() => {
                      setForm((current) => ({
                        ...current,
                        ...(picker === "tm"
                          ? { tmId: user.id }
                          : { reporterId: user.id }),
                      }));
                      setPicker(null);
                    }}
                  >
                    <View style={styles.pickerAvatar}>
                      <Text style={styles.pickerAvatarText}>
                        {displayName(user).slice(0, 1).toLocaleUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.pickerUserDetails}>
                      <Text style={styles.personName}>{displayName(user)}</Text>
                      <Text style={styles.username}>@{user.username}</Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.pickerEmpty}>
                  No hay profesionales disponibles.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={25} color="#b91c1c" />
            </View>
            <Text style={styles.confirmTitle}>Eliminar vínculo</Text>
            <Text style={styles.confirmText}>
              ¿Eliminar definitivamente este vínculo entre{" "}
              {deleteTarget?.tmLabel} y {deleteTarget?.reporterLabel}?
            </Text>
            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.deleteConfirmButton,
                  deleting && styles.disabledButton,
                ]}
                onPress={() => void confirmDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : null}
                <Text style={styles.submitText}>Eliminar</Text>
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
  listContent: { padding: 16, paddingBottom: 36 },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: 12,
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  heroCopy: { flex: 1 },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: "#991b1b", fontSize: 13 },
  retryText: { color: "#991b1b", fontWeight: "800", fontSize: 12 },
  notice: {
    backgroundColor: "#ecfdf5",
    color: "#047857",
    borderRadius: 10,
    overflow: "hidden",
    padding: 11,
    marginBottom: 12,
    fontSize: 13,
  },
  noticeError: { backgroundColor: "#fef2f2", color: "#b91c1c" },
  createButton: {
    backgroundColor: "#16a34a",
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 14,
  },
  createButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.86 },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 15,
    marginBottom: 15,
  },
  formHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  formTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 5,
    marginBottom: 7,
  },
  selectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
    backgroundColor: "#fff",
  },
  selectText: { flex: 1, color: colors.text, fontSize: 14 },
  placeholder: { color: "#94a3b8" },
  formError: { color: "#b91c1c", fontSize: 13, marginTop: 4 },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    minHeight: 43,
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  cancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
  submitButton: {
    minHeight: 43,
    minWidth: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 10,
    backgroundColor: "#16a34a",
    paddingHorizontal: 16,
  },
  deleteConfirmButton: {
    minHeight: 43,
    minWidth: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 10,
    backgroundColor: "#b91c1c",
    paddingHorizontal: 16,
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  disabledButton: { opacity: 0.55 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  listControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  countText: { color: colors.textSecondary, fontWeight: "700", fontSize: 13 },
  pageSizeControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  pageSizePicker: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#dbe2ea",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  pageSizeLabel: { color: colors.textSecondary, fontSize: 11 },
  pageSizeOption: {
    minWidth: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe2ea",
    backgroundColor: "#fff",
    paddingHorizontal: 5,
  },
  pageSizeSelected: { backgroundColor: "#e0f2fe", borderColor: colors.primary },
  pageSizeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  pageSizeTextSelected: { color: colors.primaryDark },
  pageText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 28,
    gap: 8,
    marginTop: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  linkCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 13,
    marginBottom: 10,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  linkDetails: { flex: 1, minWidth: 0 },
  personRole: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 1,
  },
  personName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  username: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 8 },
  cardActions: { flexDirection: "row", gap: 5, marginLeft: 5 },
  editAction: {
    minWidth: 52,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  editActionText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
  },
  deleteAction: {
    minWidth: 52,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  deleteActionText: {
    color: "#b91c1c",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  pageButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe2ea",
  },
  pageButtonDisabled: { opacity: 0.55 },
  pageButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  pageButtonTextDisabled: { color: "#94a3b8" },
  paginationText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    padding: 18,
  },
  pickerCard: {
    maxHeight: "82%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
  },
  pickerSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  pickerList: { flexGrow: 0 },
  pickerOption: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf0f4",
    paddingVertical: 8,
  },
  pickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pickerAvatarText: { color: colors.primaryDark, fontWeight: "800" },
  pickerUserDetails: { flex: 1 },
  pickerEmpty: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 28,
  },
  confirmCard: { backgroundColor: "#fff", borderRadius: 18, padding: 20 },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  confirmText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
});
