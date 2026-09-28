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

import { PERMISSIONS } from "@/constants/permissions";
import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  screensService,
  type FacilityOption,
  type ManagedScreen,
} from "@/features/screen-maintenance/services/screensService";
import { colors } from "@/theme/colors";

export function MantenedorPantallasScreen() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.MANAGE_SCREENS);
  const [screens, setScreens] = useState<ManagedScreen[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [facilitiesError, setFacilitiesError] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [formScreen, setFormScreen] = useState<ManagedScreen | null>(null);
  const [name, setName] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [facilityListVisible, setFacilityListVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedScreen | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadScreens = useCallback(async () => {
    setLoadError("");
    try {
      setScreens(await screensService.getScreens());
    } catch {
      setLoadError("No se pudieron cargar las pantallas. Intenta nuevamente.");
    }
  }, []);

  const loadFacilities = useCallback(async () => {
    setFacilitiesError("");
    try {
      setFacilities(await screensService.getFacilities());
    } catch {
      setFacilitiesError(
        "No se pudieron cargar las sucursales. Intenta nuevamente.",
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      await Promise.all([loadScreens(), loadFacilities()]);
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [loadFacilities, loadScreens]);

  const visibleScreens = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return screens;
    }

    return screens.filter((screen) =>
      `${screen.name} ${screen.facility_name}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [screens, search]);

  const selectedFacility = facilities.find(
    (facility) => String(facility.iden) === facilityId,
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadScreens(), loadFacilities()]);
    setIsRefreshing(false);
  };

  const openCreateForm = () => {
    setFormScreen(null);
    setName("");
    setFacilityId("");
    setFormError("");
    setFacilityListVisible(false);
    setFormVisible(true);
  };

  const openEditForm = (screen: ManagedScreen) => {
    setFormScreen(screen);
    setName(screen.name);
    setFacilityId(String(screen.facility_id));
    setFormError("");
    setFacilityListVisible(false);
    setFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }
    setFormVisible(false);
    setFacilityListVisible(false);
  };

  const saveScreen = async () => {
    const cleanName = name.trim();
    const facility = Number(facilityId);

    if (!cleanName) {
      setFormError("El nombre/identificador es obligatorio.");
      return;
    }
    if (!Number.isFinite(facility) || facility <= 0) {
      setFormError("Debes seleccionar una sucursal.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const input = { name: cleanName, facility };
      if (formScreen) {
        await screensService.updateScreen(formScreen.iden, input);
      } else {
        await screensService.createScreen(input);
      }
      setFormVisible(false);
      await loadScreens();
    } catch {
      setFormError(
        "Ocurrió un error al guardar la pantalla. Intenta nuevamente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeletingId(deleteTarget.iden);
    setDeleteError("");
    try {
      await screensService.deleteScreen(deleteTarget.iden);
      setScreens((current) =>
        current.filter((screen) => screen.iden !== deleteTarget.iden),
      );
      setDeleteTarget(null);
    } catch {
      setDeleteError("No se pudo eliminar la pantalla. Intenta nuevamente.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!canManage) {
    return (
      <View style={styles.centerState}>
        <Ionicons
          name="lock-closed-outline"
          size={32}
          color={colors.textSecondary}
        />
        <Text style={styles.stateTitle}>Acceso restringido</Text>
        <Text style={styles.stateBody}>
          No tienes permiso para administrar pantallas.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>Cargando pantallas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadScreens()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={visibleScreens}
        keyExtractor={(item) => String(item.iden)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <ModuleBanner
              title="Mantenedor de pantallas"
              subtitle="Administra las pantallas asociadas a cada sucursal."
              icon="desktop-outline"
            />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressed,
              ]}
              onPress={openCreateForm}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Nueva pantalla</Text>
            </Pressable>

            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                accessibilityLabel="Buscar por pantalla o sucursal"
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar pantalla o sucursal"
                placeholderTextColor="#94a3b8"
                returnKeyType="search"
                style={styles.searchInput}
              />
              {search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  onPress={() => setSearch("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.resultsCount}>
              {visibleScreens.length}{" "}
              {visibleScreens.length === 1 ? "pantalla" : "pantallas"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={search ? "search-outline" : "desktop-outline"}
              size={34}
              color="#94a3b8"
            />
            <Text style={styles.stateTitle}>
              {search ? "Sin resultados" : "Aún no hay pantallas"}
            </Text>
            <Text style={styles.stateBody}>
              {search
                ? "Prueba con otro nombre o sucursal."
                : "Crea una pantalla para comenzar."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.screenCard}>
            <View style={styles.cardIcon}>
              <Ionicons
                name="desktop-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.screenName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.facilityName} numberOfLines={1}>
                {item.facility_name || `Sucursal ${item.facility_id}`}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${item.name}`}
                hitSlop={8}
                style={styles.iconButton}
                onPress={() => openEditForm(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={colors.primaryDark}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.name}`}
                hitSlop={8}
                style={styles.iconButton}
                onPress={() => {
                  setDeleteTarget(item);
                  setDeleteError("");
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal
        visible={formVisible}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.formModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {formScreen ? "Editar pantalla" : "Nueva pantalla"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Completa los datos requeridos.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={closeForm}
                disabled={isSaving}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <Text style={styles.fieldLabel}>Nombre o identificador</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Pantalla recepción"
                placeholderTextColor="#94a3b8"
                autoCapitalize="sentences"
                maxLength={120}
                style={styles.textField}
                editable={!isSaving}
                returnKeyType="done"
              />

              <Text style={styles.fieldLabel}>Sucursal</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Seleccionar sucursal"
                style={styles.selector}
                onPress={() => setFacilityListVisible((current) => !current)}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedFacility && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedFacility?.name ??
                    (facilities.length
                      ? "Selecciona una sucursal"
                      : "Sin sucursales disponibles")}
                </Text>
                <Ionicons
                  name={facilityListVisible ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              {facilityListVisible ? (
                <ScrollView
                  style={styles.facilityOptions}
                  contentContainerStyle={styles.facilityOptionsContent}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {facilities.map((facility) => (
                    <Pressable
                      key={facility.iden}
                      style={styles.facilityOption}
                      onPress={() => {
                        setFacilityId(String(facility.iden));
                        setFacilityListVisible(false);
                      }}
                    >
                      <Text style={styles.facilityOptionText}>
                        {facility.name}
                      </Text>
                      {facility.iden === selectedFacility?.iden ? (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              {facilitiesError ? (
                <View style={styles.inlineError}>
                  <Text style={styles.errorText}>{facilitiesError}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadFacilities()}
                  >
                    <Text style={styles.retryText}>Reintentar</Text>
                  </Pressable>
                </View>
              ) : null}
              {formError ? (
                <Text accessibilityRole="alert" style={styles.formError}>
                  {formError}
                </Text>
              ) : null}

              <View style={styles.formActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={closeForm}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.saveButton,
                    (pressed || isSaving) && styles.pressed,
                  ]}
                  onPress={() => void saveScreen()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={deleteTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={24} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Eliminar pantalla</Text>
            <Text style={styles.confirmBody}>
              ¿Seguro que deseas eliminar “{deleteTarget?.name}”? Esta acción no
              se puede deshacer.
            </Text>
            {deleteError ? (
              <Text accessibilityRole="alert" style={styles.formError}>
                {deleteError}
              </Text>
            ) : null}
            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setDeleteTarget(null)}
                disabled={deletingId !== null}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => void confirmDelete()}
                disabled={deletingId !== null}
              >
                {deletingId !== null ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Eliminar</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  addButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  resultsCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 8,
  },
  screenCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: colors.card,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf5fc",
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
    minWidth: 0,
  },
  screenName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
  },
  facilityName: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  iconButton: {
    width: 38,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 46,
    paddingHorizontal: 20,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: colors.background,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
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
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fef2f2",
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
  },
  errorText: {
    flex: 1,
    color: "#b91c1c",
    fontSize: 13,
    lineHeight: 18,
  },
  retryText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  formModal: {
    maxHeight: "92%",
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  formContent: {
    paddingTop: 18,
    paddingBottom: 6,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  textField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    color: colors.text,
    fontSize: 15,
    marginBottom: 18,
    backgroundColor: "#fff",
  },
  selector: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  selectorText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    marginRight: 10,
  },
  selectorPlaceholder: {
    color: "#94a3b8",
  },
  facilityOptions: {
    maxHeight: 210,
    flexGrow: 0,
    flexShrink: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 11,
    marginBottom: 16,
    overflow: "hidden",
  },
  facilityOptionsContent: {
    flexGrow: 0,
  },
  facilityOption: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  facilityOptionText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    marginRight: 8,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  formError: {
    color: "#b91c1c",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#f1f5f9",
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
  },
  deleteButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.error,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  confirmModal: {
    width: "100%",
    padding: 22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.card,
  },
  confirmIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "#fef2f2",
    marginBottom: 12,
  },
  confirmBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.82,
  },
});
