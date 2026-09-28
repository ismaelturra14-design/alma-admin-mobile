import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { PERMISSIONS } from "@/constants/permissions";
import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  systemInterfacesService,
  type SystemInterface,
} from "@/features/system-interfaces/services/systemInterfacesService";
import { colors } from "@/theme/colors";

type PendingChange = {
  item: SystemInterface;
  nextStatus: 0 | 1;
};

export function SystemInterfacesScreen() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.MANAGE_INTERFACES);
  const [interfaces, setInterfaces] = useState<SystemInterface[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(
    null,
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadInterfaces = useCallback(async () => {
    setLoadError("");
    try {
      setInterfaces(await systemInterfacesService.getSystemInterfaces());
    } catch {
      setLoadError("No se pudieron cargar las interfaces. Intenta nuevamente.");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      await loadInterfaces();
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [loadInterfaces]);

  const visibleInterfaces = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return interfaces;
    }
    return interfaces.filter((item) =>
      item.description.toLocaleLowerCase().includes(query),
    );
  }, [interfaces, search]);

  const refresh = async () => {
    setIsRefreshing(true);
    await loadInterfaces();
    setIsRefreshing(false);
  };

  const requestStatusChange = (item: SystemInterface, enabled: boolean) => {
    if (!canManage || updatingId !== null) {
      return;
    }
    setActionError("");
    setPendingChange({ item, nextStatus: enabled ? 1 : 0 });
  };

  const confirmStatusChange = async () => {
    if (!pendingChange || !canManage) {
      return;
    }

    const { item, nextStatus } = pendingChange;
    setPendingChange(null);
    setUpdatingId(item.id);
    setActionError("");
    setInterfaces((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status: nextStatus } : entry,
      ),
    );

    try {
      await systemInterfacesService.updateSystemInterfaceStatus(
        item.id,
        nextStatus,
      );
    } catch {
      setInterfaces((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: item.status } : entry,
        ),
      );
      setActionError(
        "No se pudo actualizar el estado de la interfaz. Se restauró el estado anterior; intenta nuevamente.",
      );
    } finally {
      setUpdatingId(null);
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
          No tienes permiso para administrar interfaces.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>Cargando interfaces...</Text>
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
            onPress={() => void loadInterfaces()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {actionError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{actionError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar mensaje"
            onPress={() => setActionError("")}
          >
            <Ionicons name="close" size={20} color="#b91c1c" />
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={visibleInterfaces}
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
              title="Interfaces del sistema"
              subtitle="Consulta las interfaces del sistema y administra su estado."
              icon="sync-outline"
            />
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                accessibilityLabel="Buscar interfaz"
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por descripción"
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
              {visibleInterfaces.length}{" "}
              {visibleInterfaces.length === 1 ? "interfaz" : "interfaces"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={search ? "search-outline" : "sync-outline"}
              size={34}
              color="#94a3b8"
            />
            <Text style={styles.stateTitle}>
              {search ? "Sin resultados" : "Sin interfaces"}
            </Text>
            <Text style={styles.stateBody}>
              {search
                ? "Prueba con otra descripción."
                : "No hay interfaces disponibles para mostrar."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.status === 1;
          const isUpdating = updatingId === item.id;

          return (
            <View style={styles.interfaceCard}>
              <View
                style={[
                  styles.cardIcon,
                  isActive ? styles.activeIcon : styles.inactiveIcon,
                ]}
              >
                <Ionicons
                  name="sync-outline"
                  size={20}
                  color={isActive ? "#047857" : "#64748b"}
                />
              </View>
              <View style={styles.cardDetails}>
                <Text style={styles.interfaceName}>{item.description}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isActive ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      isActive ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      isActive ? styles.activeText : styles.inactiveText,
                    ]}
                  >
                    {isActive ? "Activa" : "Inactiva"}
                  </Text>
                </View>
              </View>
              <View style={styles.switchContainer}>
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    accessibilityLabel={`${isActive ? "Desactivar" : "Activar"} ${item.description}`}
                    value={isActive}
                    onValueChange={(enabled) =>
                      requestStatusChange(item, enabled)
                    }
                    disabled={updatingId !== null}
                    trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                    thumbColor={isActive ? "#059669" : "#f8fafc"}
                  />
                )}
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={pendingChange !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingChange(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <View
              style={[
                styles.confirmIcon,
                pendingChange?.nextStatus === 1
                  ? styles.confirmEnable
                  : styles.confirmDisable,
              ]}
            >
              <Ionicons
                name={
                  pendingChange?.nextStatus === 1
                    ? "checkmark-circle-outline"
                    : "pause-circle-outline"
                }
                size={26}
                color={pendingChange?.nextStatus === 1 ? "#047857" : "#b45309"}
              />
            </View>
            <Text style={styles.modalTitle}>
              {pendingChange?.nextStatus === 1
                ? "Activar interfaz"
                : "Desactivar interfaz"}
            </Text>
            <Text style={styles.confirmBody}>
              {pendingChange?.nextStatus === 1
                ? `¿Quieres activar “${pendingChange.item.description}”?`
                : `¿Quieres desactivar “${pendingChange?.item.description}”?`}
            </Text>
            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setPendingChange(null)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.confirmButton,
                  pendingChange?.nextStatus === 0 && styles.disableButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => void confirmStatusChange()}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
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
  interfaceCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 86,
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
    marginRight: 12,
  },
  activeIcon: {
    backgroundColor: "#d1fae5",
  },
  inactiveIcon: {
    backgroundColor: "#f1f5f9",
  },
  cardDetails: {
    flex: 1,
    minWidth: 0,
  },
  interfaceName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  activeBadge: {
    backgroundColor: "#ecfdf5",
  },
  inactiveBadge: {
    backgroundColor: "#f1f5f9",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: "#059669",
  },
  inactiveDot: {
    backgroundColor: "#94a3b8",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  activeText: {
    color: "#047857",
  },
  inactiveText: {
    color: "#475569",
  },
  switchContainer: {
    width: 54,
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
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
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  confirmModal: {
    padding: 22,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  confirmIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    marginBottom: 14,
  },
  confirmEnable: {
    backgroundColor: "#d1fae5",
  },
  confirmDisable: {
    backgroundColor: "#fef3c7",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  confirmBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
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
  confirmButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
  },
  disableButton: {
    backgroundColor: "#b45309",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
