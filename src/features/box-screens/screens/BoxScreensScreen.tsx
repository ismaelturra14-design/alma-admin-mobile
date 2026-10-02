import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
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
import { PaginatedList } from "@/components/ui/PaginatedList";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
    boxScreensService,
    type BoxOption,
    type BoxScreenAssignment,
    type BoxScreenInput,
    type FacilityOption,
    type ScreenOption,
} from "@/features/box-screens/services/boxScreensService";
import { colors } from "@/theme/colors";

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

type LoadErrors = {
  assignments?: string;
  facilities?: string;
  screens?: string;
  boxes?: string;
};

export function BoxScreensScreen() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.MANAGE_SCREENS);

  const [assignments, setAssignments] = useState<BoxScreenAssignment[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [boxes, setBoxes] = useState<BoxOption[]>([]);
  const [screens, setScreens] = useState<ScreenOption[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadErrors, setLoadErrors] = useState<LoadErrors>({});
  const [formVisible, setFormVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<BoxScreenAssignment | null>(null);
  const [facilityId, setFacilityId] = useState("");
  const [boxId, setBoxId] = useState("");
  const [screenId, setScreenId] = useState("");
  const [facilityListVisible, setFacilityListVisible] = useState(false);
  const [boxListVisible, setBoxListVisible] = useState(false);
  const [screenListVisible, setScreenListVisible] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BoxScreenAssignment | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const boxesRequestIdRef = useRef<number | null>(null);

  const loadAssignments = useCallback(async () => {
    try {
      const value = await boxScreensService.getAssignments();
      setAssignments(value);
      setLoadErrors((current) => {
        const next = { ...current };
        delete next.assignments;
        return next;
      });
    } catch (error) {
      const message = "No se pudieron cargar las asignaciones.";
      console.warn("BoxScreensScreen loadAssignments failed", error);
      setLoadErrors((current) => ({ ...current, assignments: message }));
    }
  }, []);

  const loadFacilities = useCallback(async () => {
    try {
      const value = await boxScreensService.getFacilities();
      setFacilities(value);
      setLoadErrors((current) => {
        const next = { ...current };
        delete next.facilities;
        return next;
      });
    } catch (error) {
      const message = "No se pudieron cargar las sucursales.";
      console.warn("BoxScreensScreen loadFacilities failed", error);
      setLoadErrors((current) => ({ ...current, facilities: message }));
    }
  }, []);

  const loadScreens = useCallback(async () => {
    try {
      const value = await boxScreensService.getScreens();
      setScreens(value);
      setLoadErrors((current) => {
        const next = { ...current };
        delete next.screens;
        return next;
      });
    } catch (error) {
      const message = "No se pudieron cargar las pantallas.";
      console.warn("BoxScreensScreen loadScreens failed", error);
      setLoadErrors((current) => ({ ...current, screens: message }));
    }
  }, []);

  const loadBoxesForFacility = useCallback(async (facilityIdToLoad: number) => {
    const currentRequestId = Date.now();
    boxesRequestIdRef.current = currentRequestId;
    setBoxes([]);
    setBoxId("");
    setBoxListVisible(false);
    setLoadErrors((current) => {
      const next = { ...current };
      delete next.boxes;
      return next;
    });

    try {
      const value = await boxScreensService.getBoxesByFacility(facilityIdToLoad);
      if (boxesRequestIdRef.current !== currentRequestId) {
        return;
      }
      setBoxes(value);
    } catch (error) {
      console.warn("BoxScreensScreen loadBoxesByFacility failed", {
        facilityId: facilityIdToLoad,
        error,
      });
      if (boxesRequestIdRef.current !== currentRequestId) {
        return;
      }
      setLoadErrors((current) => ({ ...current, boxes: "No se pudieron cargar los boxes." }));
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    await Promise.allSettled([loadFacilities(), loadScreens()]);
  }, [loadFacilities, loadScreens]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      await Promise.allSettled([loadAssignments(), loadCatalogs()]);
      if (active) {
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [loadAssignments, loadCatalogs]);

  const visibleAssignments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) =>
      `${assignment.facility_name} ${assignment.box_name} ${assignment.screen_name} ${assignment.screen_id}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [assignments, search]);

  const selectedFacility = facilities.find(
    (facility) => String(facility.id) === facilityId,
  );
  const selectedBox = boxes.find((box) => String(box.id) === boxId);
  const selectedScreen = screens.find((entry) => entry.id === screenId);

  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([loadAssignments(), loadCatalogs()]);
    setIsRefreshing(false);
  };

  const openCreateForm = () => {
    if (!canManage) {
      return;
    }
    setEditingAssignment(null);
    setFacilityId("");
    setBoxId("");
    setScreenId("");
    setBoxes([]);
    setFormError("");
    setFacilityListVisible(false);
    setBoxListVisible(false);
    setScreenListVisible(false);
    setFormVisible(true);
  };

  const openEditForm = async (assignment: BoxScreenAssignment) => {
    if (!canManage) {
      return;
    }
    setEditingAssignment(assignment);
    setFacilityId(String(assignment.facility_id));
    setBoxId("");
    setScreenId(String(assignment.screen_id));
    setFormError("");
    setFacilityListVisible(false);
    setBoxListVisible(false);
    setScreenListVisible(false);

    await loadBoxesForFacility(assignment.facility_id);
    setBoxId(String(assignment.box_id));
    setFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }
    setFormVisible(false);
    setFacilityListVisible(false);
    setBoxListVisible(false);
    setScreenListVisible(false);
  };

  const handleFacilitySelection = async (nextFacilityId: number) => {
    setFacilityId(String(nextFacilityId));
    setBoxId("");
    setFacilityListVisible(false);
    setBoxListVisible(false);
    setFormError("");
    await loadBoxesForFacility(nextFacilityId);
  };

  const saveAssignment = async () => {
    if (!canManage) {
      return;
    }
    const validFacilityId = Number(facilityId);
    const validBoxId = Number(boxId);
    const cleanScreenId = normalizeText(screenId);

    if (!Number.isFinite(validFacilityId) || validFacilityId <= 0) {
      setFormError("Debes seleccionar una sucursal.");
      return;
    }
    if (!Number.isFinite(validBoxId) || validBoxId <= 0) {
      setFormError("Debes seleccionar un box.");
      return;
    }
    if (!cleanScreenId) {
      setFormError("Debes seleccionar una pantalla.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    const payload: BoxScreenInput = {
      facility_id: validFacilityId,
      box_id: validBoxId,
      screen_id: cleanScreenId,
    };

    try {
      if (editingAssignment) {
        await boxScreensService.updateBoxScreen(editingAssignment.iden, payload);
      } else {
        await boxScreensService.createBoxScreen(payload);
      }
      setFormVisible(false);
      await loadAssignments();
    } catch (error) {
      console.warn("BoxScreensScreen saveAssignment failed", error);
      setFormError("No se pudo guardar el vínculo. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!canManage || !deleteTarget) {
      return;
    }

    setDeletingId(deleteTarget.iden);
    setDeleteError("");

    try {
      await boxScreensService.deleteBoxScreen(deleteTarget.iden);
      setAssignments((current) =>
        current.filter((assignment) => assignment.iden !== deleteTarget.iden),
      );
      setDeleteTarget(null);
    } catch (error) {
      console.warn("BoxScreensScreen deleteAssignment failed", error);
      setDeleteError("No se pudo eliminar el vínculo. Intenta nuevamente.");
    } finally {
      setDeletingId(null);
    }
  };

  const retryFailedLoad = useCallback(async () => {
    const failedKeys = Object.keys(loadErrors) as Array<keyof LoadErrors>;
    if (failedKeys.length === 0) {
      await Promise.allSettled([loadAssignments(), loadCatalogs()]);
      return;
    }

    const retryTargets = failedKeys.map((key) => {
      if (key === "assignments") return loadAssignments();
      if (key === "facilities") return loadFacilities();
      if (key === "screens") return loadScreens();
      if (key === "boxes") {
        const parsed = Number(facilityId);
        return Number.isFinite(parsed) && parsed > 0
          ? loadBoxesForFacility(parsed)
          : Promise.resolve();
      }
      return Promise.resolve();
    });

    await Promise.allSettled(retryTargets);
  }, [facilityId, loadAssignments, loadCatalogs, loadFacilities, loadScreens, loadBoxesForFacility, loadErrors]);

  const errorEntries = Object.entries(loadErrors);

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
          No tienes permiso para administrar vínculos de box-pantalla.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>Cargando vínculos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorEntries.length > 0 ? (
        <View style={styles.errorList}>
          {errorEntries.map(([key, message]) => (
            <View key={key} style={styles.errorBanner}>
              <Text style={styles.errorText}>{message}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void retryFailedLoad()}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <PaginatedList
        data={visibleAssignments}
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
              title="Box Pantalla"
              subtitle="Configura qué pantalla muestra el aviso de cada box y sucursal."
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
              <Text style={styles.addButtonText}>Agregar vínculo</Text>
            </Pressable>

            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                accessibilityLabel="Buscar por sucursal, box o pantalla"
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar sucursal, box o pantalla"
                placeholderTextColor="#94a3b8"
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
              {visibleAssignments.length}{" "}
              {visibleAssignments.length === 1 ? "vínculo" : "vínculos"}
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
              {search ? "Sin resultados" : "Aún no hay vínculos"}
            </Text>
            <Text style={styles.stateBody}>
              {search
                ? "Prueba con otra sucursal, box o código."
                : "Agrega un nuevo vínculo para empezar."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.assignmentCard}>
            <View style={styles.cardIcon}>
              <Ionicons
                name="desktop-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>

            <View style={styles.cardDetails}>
              <Text style={styles.titleText} numberOfLines={1}>
                {item.facility_name}
              </Text>
              <Text style={styles.metaText}>Box: {normalizeText(item.box_name)}</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                Pantalla: {item.screen_name || item.screen_id}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar vínculo de ${item.box_name}`}
                hitSlop={8}
                style={styles.iconButton}
                onPress={() => void openEditForm(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={colors.primaryDark}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Eliminar vínculo de ${item.box_name}`}
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
                  {editingAssignment ? "Editar vínculo" : "Nuevo vínculo"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Relaciona sucursal, box y pantalla.
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
              <Text style={styles.fieldLabel}>Sucursal</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Seleccionar sucursal"
                style={styles.selector}
                onPress={() => {
                  setFacilityListVisible((current) => !current);
                  setBoxListVisible(false);
                  setScreenListVisible(false);
                }}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedFacility && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedFacility?.name ??
                    (facilities.length ? "Selecciona una sucursal" : "Sin sucursales")}
                </Text>
                <Ionicons
                  name={facilityListVisible ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              {facilityListVisible ? (
                <View style={styles.optionList}>
                  {facilities.map((facility) => (
                    <Pressable
                      key={facility.id}
                      style={styles.optionItem}
                      onPress={() => void handleFacilitySelection(facility.id)}
                    >
                      <Text style={styles.optionText}>{facility.name}</Text>
                      {facility.id === selectedFacility?.id ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Box</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Seleccionar box"
                style={styles.selector}
                onPress={() => {
                  setBoxListVisible((current) => !current);
                  setFacilityListVisible(false);
                  setScreenListVisible(false);
                }}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedBox && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedBox?.label ??
                    (boxes.length ? "Selecciona un box" : "Sin boxes disponibles")}
                </Text>
                <Ionicons
                  name={boxListVisible ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              {boxListVisible ? (
                <View style={styles.optionList}>
                  {boxes.map((box) => (
                    <Pressable
                      key={box.id}
                      style={styles.optionItem}
                      onPress={() => {
                        setBoxId(String(box.id));
                        setBoxListVisible(false);
                      }}
                    >
                      <Text style={styles.optionText}>{box.label}</Text>
                      {box.id === selectedBox?.id ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Pantalla</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Seleccionar pantalla"
                style={styles.selector}
                onPress={() => {
                  setScreenListVisible((current) => !current);
                  setFacilityListVisible(false);
                  setBoxListVisible(false);
                }}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedScreen && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedScreen?.label ??
                    (screens.length ? "Selecciona una pantalla" : "Sin pantallas")}
                </Text>
                <Ionicons
                  name={screenListVisible ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>

              {screenListVisible ? (
                <View style={styles.optionList}>
                  {screens.map((screen) => (
                    <Pressable
                      key={screen.id}
                      style={styles.optionItem}
                      onPress={() => {
                        setScreenId(screen.id);
                        setScreenListVisible(false);
                      }}
                    >
                      <Text style={styles.optionText}>{screen.label}</Text>
                      {screen.id === selectedScreen?.id ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  ))}
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
                  onPress={() => void saveAssignment()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingAssignment ? "Guardar" : "Crear vínculo"}
                    </Text>
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
            <Text style={styles.modalTitle}>Eliminar vínculo</Text>
            <Text style={styles.confirmBody}>
              ¿Seguro que deseas eliminar la asignación entre el box {normalizeText(deleteTarget?.box_name ?? "")} y la pantalla {deleteTarget?.screen_name || deleteTarget?.screen_id}?
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
  errorList: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
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
  assignmentCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 88,
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
  titleText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 2,
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
  optionList: {
    maxHeight: 210,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 11,
    marginBottom: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  optionItem: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    marginRight: 8,
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
