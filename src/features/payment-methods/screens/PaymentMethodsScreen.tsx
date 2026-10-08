import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { ConfirmDialog } from "@/components/ui/DesignSystem";
import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { PaginatedList } from "@/components/ui/PaginatedList";
import {
    paymentMethodsService,
    type PaymentMethod,
} from "@/features/payment-methods/services/paymentMethodsService";
import { colors } from "@/theme/colors";
import { getFriendlyErrorMessage } from "@/utils/apiError";

function getErrorMessage(error: unknown, fallback: string): string {
  return getFriendlyErrorMessage(error, fallback);
}

function getSuccessMessage(response: unknown, fallback: string): string {
  if (typeof response === "object" && response !== null && "message" in response) {
    const nextMessage = response.message;
    if (typeof nextMessage === "string" && nextMessage.trim()) {
      return nextMessage.trim();
    }
  }
  return fallback;
}

export function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const loadMethods = useCallback(async () => {
    setLoadError("");
    try {
      setMethods(await paymentMethodsService.getMethods());
    } catch (error) {
      setLoadError(
        getErrorMessage(error, "No se pudieron cargar los métodos de pago."),
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      await loadMethods();
      if (active) {
        setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loadMethods]);

  const visibleMethods = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? methods.filter((method) => method.nombre.toLocaleLowerCase().includes(query))
      : methods;
  }, [methods, search]);

  const refresh = async () => {
    setIsRefreshing(true);
    await loadMethods();
    setIsRefreshing(false);
  };

  const openCreateForm = () => {
    setEditingMethod(null);
    setName("");
    setFormError("");
    setSuccessMessage("");
    setFormVisible(true);
  };

  const openEditForm = (method: PaymentMethod) => {
    setEditingMethod(method);
    setName(method.nombre);
    setFormError("");
    setSuccessMessage("");
    setFormVisible(true);
  };

  const closeForm = () => {
    if (!isSaving) {
      setFormVisible(false);
    }
  };

  const saveMethod = async () => {
    const cleanName = name.replace(/\s+/g, " ").trim();
    if (!cleanName) {
      setFormError("El nombre del método de pago es obligatorio.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const response = editingMethod
        ? await paymentMethodsService.updateMethod(editingMethod.id, {
            nombre: cleanName,
          })
        : await paymentMethodsService.createMethod({ nombre: cleanName });
      setSuccessMessage(
        getSuccessMessage(
          response,
          editingMethod
            ? "Método de pago actualizado exitosamente."
            : "Método de pago creado exitosamente.",
        ),
      );
      setFormVisible(false);
      await loadMethods();
    } catch (error) {
      setFormError(
        getErrorMessage(error, "No se pudo guardar el método de pago."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setDeletingId(target.id);
    setDeleteError("");
    setSuccessMessage("");
    try {
      const response = await paymentMethodsService.deleteMethod(target.id);
      setMethods((current) => current.filter((method) => method.id !== target.id));
      setDeleteTarget(null);
      setSuccessMessage(
        getSuccessMessage(response, "Método de pago eliminado exitosamente."),
      );
      await loadMethods();
    } catch (error) {
      setDeleteError(
        getErrorMessage(error, "No se pudo eliminar el método de pago."),
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>Cargando métodos de pago...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loadError ? (
        <View style={styles.messageBanner}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {loadError}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void loadMethods()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
      {successMessage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar mensaje"
          style={styles.successBanner}
          onPress={() => setSuccessMessage("")}
        >
          <Text style={styles.successText}>{successMessage}</Text>
          <Ionicons name="close" size={18} color={colors.success} />
        </Pressable>
      ) : null}

      <PaginatedList
        data={visibleMethods}
        keyExtractor={(item) => String(item.id)}
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
              title="Métodos de pago"
              subtitle="Administra las formas de pago disponibles."
              icon="wallet-outline"
            />
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              onPress={openCreateForm}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Nuevo método</Text>
            </Pressable>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
              <TextInput
                accessibilityLabel="Buscar método de pago"
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar método de pago"
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
                  <Ionicons name="close-circle" size={19} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.resultsCount}>
              {visibleMethods.length} {visibleMethods.length === 1 ? "método" : "métodos"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={search ? "search-outline" : "wallet-outline"}
              size={34}
              color="#94a3b8"
            />
            <Text style={styles.stateTitle}>
              {search ? "Sin resultados" : "Aún no hay métodos de pago"}
            </Text>
            <Text style={styles.stateBody}>
              {search ? "Prueba con otro nombre." : "Crea un método para comenzar."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.methodRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.methodName} numberOfLines={2}>{item.nombre}</Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${item.nombre}`}
                hitSlop={8}
                style={styles.iconButton}
                onPress={() => openEditForm(item)}
              >
                <Ionicons name="create-outline" size={20} color={colors.primaryDark} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.nombre}`}
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

      <Modal visible={formVisible} animationType="slide" transparent onRequestClose={closeForm}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.formModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingMethod ? "Editar método" : "Nuevo método de pago"}
                </Text>
                <Text style={styles.modalSubtitle}>Ingresa el nombre del método.</Text>
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
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <TextInput
                accessibilityLabel="Nombre del método de pago"
                value={name}
                onChangeText={(nextValue) => {
                  setName(nextValue);
                  if (formError) {
                    setFormError("");
                  }
                }}
                placeholder="Ej. Transferencia bancaria"
                placeholderTextColor="#94a3b8"
                autoCapitalize="sentences"
                returnKeyType="done"
                editable={!isSaving}
                onSubmitEditing={() => void saveMethod()}
                style={[styles.nameInput, formError ? { borderColor: colors.error } : null]}
              />
              {formError ? (
                <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text>
              ) : null}
              <View style={styles.formActions}>
                <Pressable style={styles.cancelButton} onPress={closeForm} disabled={isSaving}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
                  onPress={() => void saveMethod()}
                  disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.saveButtonText}>
                      {editingMethod ? "Guardar" : "Crear método"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={deleteTarget !== null}
        title="Eliminar método"
        message={
          deleteTarget
            ? `¿Deseas eliminar este registro?\n\n"${deleteTarget.nombre}"\n\nEsta acción no se puede deshacer.`
            : "¿Deseas eliminar este registro?"
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        loading={deletingId !== null}
        onConfirm={() => {
          void confirmDelete();
        }}
        onCancel={() => setDeleteTarget(null)}
      />
      {deleteError ? (
        <View style={[styles.messageBanner, { marginTop: 4, marginHorizontal: 16 }]}>
          <Text accessibilityRole="alert" style={styles.errorText}>{deleteError}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  centerState: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12,
    backgroundColor: colors.background,
  },
  stateTitle: { color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
  stateBody: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
  messageBanner: {
    marginHorizontal: 16, marginTop: 12, padding: 12, borderWidth: 1,
    borderColor: "#fecaca", borderRadius: 10, backgroundColor: "#fef2f2", gap: 8,
  },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  retryText: { color: colors.primaryDark, fontSize: 14, fontWeight: "700" },
  successBanner: {
    marginHorizontal: 16, marginTop: 12, padding: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between", gap: 8, borderWidth: 1,
    borderColor: colors.successBorder, borderRadius: 10, backgroundColor: colors.successBackground,
  },
  successText: { flex: 1, color: colors.success, fontSize: 14, lineHeight: 20 },
  addButton: {
    minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, borderRadius: 10, backgroundColor: colors.primary,
  },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.82 },
  searchBox: {
    minHeight: 46, marginTop: 14, paddingHorizontal: 12, flexDirection: "row",
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, backgroundColor: colors.card,
  },
  searchInput: { flex: 1, minHeight: 44, color: colors.text, fontSize: 15 },
  resultsCount: { marginTop: 12, marginBottom: 8, color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  emptyState: { flex: 1, minHeight: 220, alignItems: "center", justifyContent: "center", gap: 10 },
  methodRow: {
    minHeight: 72, marginBottom: 10, padding: 12, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card,
  },
  cardIcon: {
    width: 40, height: 40, marginRight: 12, alignItems: "center", justifyContent: "center",
    borderRadius: 10, backgroundColor: "#eff6ff",
  },
  cardDetails: { flex: 1, minWidth: 0 },
  methodName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconButton: { width: 38, height: 40, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(15, 23, 42, 0.48)" },
  formModal: { maxHeight: "90%", padding: 20, borderRadius: 16, backgroundColor: colors.card },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  modalSubtitle: { marginTop: 4, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  formContent: { paddingTop: 20, paddingBottom: 4 },
  fieldLabel: { marginBottom: 8, color: colors.text, fontSize: 14, fontWeight: "600" },
  nameInput: {
    minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, backgroundColor: "#fff", color: colors.text, fontSize: 16,
  },
  formError: { marginTop: 12, color: colors.error, fontSize: 14, lineHeight: 20 },
  formActions: { marginTop: 22, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelButton: {
    minHeight: 46, minWidth: 96, paddingHorizontal: 16, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
  },
  cancelButtonText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  saveButton: {
    minHeight: 46, minWidth: 112, paddingHorizontal: 16, alignItems: "center", justifyContent: "center",
    borderRadius: 10, backgroundColor: colors.primary,
  },
  deleteButton: {
    minHeight: 46, minWidth: 112, paddingHorizontal: 16, alignItems: "center", justifyContent: "center",
    borderRadius: 10, backgroundColor: colors.error,
  },
  saveButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  confirmModal: { padding: 22, borderRadius: 16, backgroundColor: colors.card },
  confirmIcon: {
    width: 48, height: 48, marginBottom: 14, alignItems: "center", justifyContent: "center",
    borderRadius: 24, backgroundColor: "#fef2f2",
  },
  confirmBody: { marginTop: 8, color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
});