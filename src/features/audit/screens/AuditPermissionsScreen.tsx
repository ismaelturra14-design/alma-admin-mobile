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
import { Pagination } from "@/components/ui/PaginatedList";
import { PERMISSIONS } from "@/constants/permissions";
import { PAGE_SIZE } from "@/constants/theme";
import { auditService } from "@/features/audit/services/auditService";
import type { AuditMeta, AuditRecord } from "@/features/audit/types/audit";
import { useAuth } from "@/features/auth/context/AuthContext";
import { colors } from "@/theme/colors";

function formatDate(value: string): string {
  if (!value) {
    return "Fecha no disponible";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function readableLabel(value: string): string {
  const knownLabels: Record<string, string> = {
    motivo: "Motivo",
    permisos_anteriores: "Permisos anteriores",
    permisos_nuevos: "Permisos actuales",
    permisos_agregados: "Permisos agregados",
    permisos_removidos: "Permisos retirados",
    user_id: "ID de usuario",
    usuario_id: "ID de usuario",
    permission_id: "ID de permiso",
    permiso_id: "ID de permiso",
    record_id: "ID del registro",
    ip_address: "Dirección IP",
    id: "Identificador",
    iden: "Identificador",
  };

  const normalized = value.trim().toLocaleLowerCase();
  if (knownLabels[normalized]) {
    return knownLabels[normalized];
  }

  return value
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase()
    .replace(/\b[a-záéíóúñ]/g, (first) => first.toLocaleUpperCase())
    .replace(/\bid\b/gi, "ID")
    .replace(/\bId\b/g, "ID");
}

function readableAction(value: string): string {
  const labels: Record<string, string> = {
    CREATE: "Creación",
    INSERT: "Creación",
    UPDATE: "Actualización",
    EDIT: "Edición",
    DELETE: "Eliminación",
    REMOVE: "Eliminación",
    LOGIN: "Inicio de sesión",
    LOGOUT: "Cierre de sesión",
    GRANT: "Permiso asignado",
    REVOKE: "Permiso retirado",
  };
  return labels[value.toLocaleUpperCase()] ?? readableLabel(value);
}

function describePermissionCode(value: string): string | null {
  const segments = value.split(/[.:/]/).filter(Boolean);
  if (segments.length < 2 || !/^[\w.-]+$/.test(value)) {
    return null;
  }

  const actionLabels: Record<string, string> = {
    ver: "Ver",
    leer: "Consultar",
    view: "Ver",
    read: "Consultar",
    crear: "Crear",
    create: "Crear",
    editar: "Editar",
    edit: "Editar",
    update: "Actualizar",
    eliminar: "Eliminar",
    delete: "Eliminar",
    administrar: "Administrar",
    manage: "Administrar",
  };
  const moduleName = segments.slice(0, -1).map(readableLabel).join(" · ");
  const action = segments[segments.length - 1].toLocaleLowerCase();
  return `${moduleName} · ${actionLabels[action] ?? readableLabel(action)}`;
}

function parseStructuredString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function renderDetailValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return null;
}

export function AuditPermissionsScreen() {
  const { hasPermission } = useAuth();
  const canView = hasPermission(PERMISSIONS.AUDIT_GLOBAL);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [meta, setMeta] = useState<AuditMeta>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(
    null,
  );

  const loadPage = useCallback(async (requestedPage: number) => {
    if (!canView) {
      return;
    }
    setErrorMessage("");
    try {
      const result = await auditService.getAuditPage({
        page: requestedPage,
        limit: PAGE_SIZE,
        sortOrder: "DESC",
      });
      setRecords(result.data);
      setMeta(result.meta);
      setPage(result.meta.page);
    } catch {
      setErrorMessage(
        "No se pudo cargar el historial de auditoría. Intenta nuevamente.",
      );
    }
  }, [canView]);

  useEffect(() => {
    let isMounted = true;

    if (!canView) {
      return () => {
        isMounted = false;
      };
    }

    const load = async () => {
      setIsLoading(true);
      await loadPage(1);
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [canView, loadPage]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return records;
    }
    return records.filter((record) =>
      [
        record.user_name,
        record.module,
        record.action_type,
        record.record_id,
      ].some((value) =>
        String(value ?? "")
          .toLocaleLowerCase()
          .includes(query),
      ),
    );
  }, [records, search]);

  const refresh = async () => {
    setIsRefreshing(true);
    await loadPage(page);
    setIsRefreshing(false);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > meta.totalPages || nextPage === page) {
      return;
    }
    setIsLoading(true);
    void loadPage(nextPage).finally(() => setIsLoading(false));
  };

  if (!canView) {
    return (
      <View style={styles.centerState}>
        <Ionicons
          name="lock-closed-outline"
          size={32}
          color={colors.textSecondary}
        />
        <Text style={styles.stateTitle}>Acceso restringido</Text>
        <Text style={styles.stateBody}>
          No tienes permiso para consultar la auditoría global.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadPage(page)}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={visibleRecords}
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
              title="Auditoría de permisos"
              subtitle="Consulta los cambios registrados en los permisos del sistema."
              icon="shield-checkmark-outline"
              eyebrow="SEGURIDAD & CONTROL"
            />
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.textSecondary}
              />
              <TextInput
                accessibilityLabel="Buscar en la página actual de auditoría"
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar usuario, módulo, acción o ID"
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
            <View style={styles.summaryRow}>
              <Text style={styles.resultsCount}>
                {meta.total} {meta.total === 1 ? "evento" : "eventos"}
              </Text>
              <View style={styles.pageBadge}>
                <Text style={styles.pageBadgeText}>
                  Página {page} de {meta.totalPages}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={search ? "search-outline" : "document-text-outline"}
              size={34}
              color="#94a3b8"
            />
            <Text style={styles.stateTitle}>
              {search ? "Sin resultados" : "Sin registros de auditoría"}
            </Text>
            <Text style={styles.stateBody}>
              {search
                ? "No se encontraron eventos en esta página."
                : "No hay eventos disponibles para mostrar."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver detalle de ${item.action_type} en ${item.module}, ${item.user_name}`}
            style={({ pressed }) => [
              styles.auditCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setSelectedRecord(item)}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.eventIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color={colors.primaryDark}
                />
              </View>
              <View style={styles.eventHeading}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.user_name}
                </Text>
                <Text style={styles.dateText}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color="#94a3b8" />
            </View>
            <View style={styles.badgesRow}>
              <View style={styles.moduleBadge}>
                <Text style={styles.moduleBadgeText}>
                  {readableLabel(item.module)}
                </Text>
              </View>
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>
                  {readableAction(item.action_type)}
                </Text>
              </View>
              {item.record_id !== null ? (
                <Text style={styles.recordId}>ID {item.record_id}</Text>
              ) : null}
            </View>
            <Text style={styles.detailsLink}>Ver detalle</Text>
          </Pressable>
        )}
        ListFooterComponent={
          <Pagination page={page} totalItems={meta.total} onPageChange={goToPage} disabled={isLoading} />
        }
      />

      <Modal
        visible={selectedRecord !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRecord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>Detalle del evento</Text>
                {selectedRecord ? (
                  <Text style={styles.modalSubtitle}>
                    #{selectedRecord.id} ·{" "}
                    {formatDate(selectedRecord.created_at)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle"
                onPress={() => setSelectedRecord(null)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedRecord ? (
              <ScrollView
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator
              >
                <View style={styles.metadataGrid}>
                  <Metadata label="Usuario" value={selectedRecord.user_name} />
                  <Metadata
                    label="Módulo"
                    value={readableLabel(selectedRecord.module)}
                  />
                  <Metadata
                    label="Acción"
                    value={readableAction(selectedRecord.action_type)}
                  />
                  <Metadata
                    label="ID registro"
                    value={
                      selectedRecord.record_id === null
                        ? "—"
                        : String(selectedRecord.record_id)
                    }
                  />
                  <Metadata
                    label="Dirección IP"
                    value={selectedRecord.ip_address ?? "—"}
                  />
                </View>

                {Object.keys(selectedRecord.details).length ? (
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionHeading}>
                      Cambios y detalles
                    </Text>
                    {Object.entries(selectedRecord.details).map(
                      ([key, value]) => (
                        <DetailEntry key={key} label={key} value={value} />
                      ),
                    )}
                  </View>
                ) : (
                  <View style={styles.noDetails}>
                    <Ionicons
                      name="information-circle-outline"
                      size={21}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.noDetailsText}>
                      Este evento no incluye detalles adicionales.
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metadataItem}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue}>{value}</Text>
    </View>
  );
}

function DetailEntry({ label, value }: { label: string; value: unknown }) {
  const displayLabel = readableLabel(label);
  const normalizedValue =
    typeof value === "string" ? parseStructuredString(value) : value;
  const scalarValue = renderDetailValue(normalizedValue);
  const isPermissionList =
    Array.isArray(normalizedValue) && /permis|permission/i.test(label);
  const isPermissionContext = /permis|permission/i.test(label);
  const permissionLabel =
    isPermissionContext && typeof scalarValue === "string"
      ? describePermissionCode(scalarValue)
      : null;

  if (scalarValue !== null) {
    return (
      <View style={styles.detailEntry}>
        <Text style={styles.detailLabel}>{displayLabel}</Text>
        {permissionLabel ? (
          <>
            <Text style={styles.detailValue}>{permissionLabel}</Text>
            <Text style={styles.technicalValue}>{scalarValue}</Text>
          </>
        ) : (
          <Text style={styles.detailValue}>{scalarValue}</Text>
        )}
      </View>
    );
  }

  if (Array.isArray(normalizedValue)) {
    return (
      <View style={styles.detailEntry}>
        <Text style={styles.detailLabel}>{displayLabel}</Text>
        {normalizedValue.length ? (
          <View style={styles.chipList}>
            {normalizedValue.map((entry, index) => {
              const rawText =
                renderDetailValue(entry) ?? JSON.stringify(entry) ?? "Dato";
              const friendlyText = isPermissionList
                ? describePermissionCode(rawText)
                : null;
              return (
                <View
                  key={`${label}-${rawText}-${index}`}
                  style={[
                    styles.permissionChip,
                    isPermissionList && styles.permissionChipAccent,
                  ]}
                >
                  <Text style={styles.permissionChipText}>
                    {friendlyText ?? rawText}
                  </Text>
                  {friendlyText ? (
                    <Text style={styles.technicalValue}>{rawText}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyPermissionText}>
            No hay permisos en esta categoría.
          </Text>
        )}
      </View>
    );
  }

  if (typeof normalizedValue === "object" && normalizedValue !== null) {
    const entries = Object.entries(normalizedValue);
    return (
      <View style={styles.detailEntry}>
        <Text style={styles.detailLabel}>{displayLabel}</Text>
        {entries.length ? (
          <View style={styles.nestedDetails}>
            {entries.map(([key, nestedValue]) => (
              <DetailEntry
                key={`${label}-${key}`}
                label={key}
                value={nestedValue}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyPermissionText}>
            Sin información adicional.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.detailEntry}>
      <Text style={styles.detailLabel}>{displayLabel}</Text>
      <Text style={styles.emptyPermissionText}>
        Sin información disponible.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 8,
  },
  resultsCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  pageBadge: {
    backgroundColor: "#eaf5fc",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  pageBadgeText: { color: colors.primaryDark, fontSize: 12, fontWeight: "700" },
  auditCard: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: colors.card,
  },
  cardPressed: { opacity: 0.82 },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf5fc",
    marginRight: 11,
  },
  eventHeading: { flex: 1, minWidth: 0 },
  userName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateText: { color: colors.textSecondary, fontSize: 12 },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },
  moduleBadge: {
    backgroundColor: "#eef2ff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  moduleBadgeText: { color: "#4338ca", fontSize: 11, fontWeight: "700" },
  actionBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionBadgeText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  recordId: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
  detailsLink: {
    alignSelf: "flex-end",
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  emptyState: { alignItems: "center", paddingTop: 46, paddingHorizontal: 20 },
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
  errorText: { flex: 1, color: "#b91c1c", fontSize: 13, lineHeight: 18 },
  retryText: { color: colors.primaryDark, fontSize: 13, fontWeight: "700" },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 10,
  },
  pageButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pageButtonDisabled: { backgroundColor: "#f8fafc" },
  pageButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  pageButtonTextDisabled: { color: "#94a3b8" },
  paginationCount: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  footerSpacer: { height: 16 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  detailModal: {
    maxHeight: "90%",
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 26,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalHeading: { flex: 1, marginRight: 12 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  detailContent: { paddingTop: 16, paddingBottom: 10 },
  metadataGrid: { gap: 10 },
  metadataItem: { padding: 12, borderRadius: 11, backgroundColor: "#f8fafc" },
  metadataLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metadataValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  detailsSection: { marginTop: 20 },
  sectionHeading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  detailEntry: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  detailValue: { color: colors.text, fontSize: 14, lineHeight: 20 },
  technicalValue: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  emptyPermissionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: "italic",
  },
  chipList: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  permissionChip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  permissionChipAccent: { backgroundColor: "#eaf5fc" },
  permissionChipText: { color: colors.text, fontSize: 12, lineHeight: 17 },
  nestedDetails: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#dbeafe",
  },
  noDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    padding: 12,
    borderRadius: 11,
    backgroundColor: "#f8fafc",
  },
  noDetailsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
