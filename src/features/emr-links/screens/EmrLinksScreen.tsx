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

import { useAuth } from "@/features/auth/context/AuthContext";
import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { emrLinksService } from "@/features/emr-links/services/emrLinksService";
import type {
  EmrLink,
  EmrOption,
  PrestationOption,
} from "@/features/emr-links/services/emrLinksService";
import { specialtyService } from "@/features/specialty-groups/services/specialtyService";
import type { Especialidad } from "@/features/specialty-groups/types/especialidad";
import { colors } from "@/theme/colors";

type PickerKind = "specialty" | "prestation" | "emr" | null;
type SelectOption = { value: string; label: string };
type LinkForm = {
  specialtyId: string;
  categorieId: string;
  emrId: string;
};

const PAGE_SIZE = 8;

function errorMessage(error: unknown, fallback: string): string {
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

function emptyForm(): LinkForm {
  return { specialtyId: "", categorieId: "", emrId: "" };
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  search,
  onSearchChange,
  onSelect,
  open,
  onToggle,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: SelectOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  const query = normalized(search);
  const filtered = query
    ? options.filter((option) => normalized(option.label).includes(query))
    : options;

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, disabled }}
        style={[styles.selectButton, disabled && styles.disabledControl]}
        disabled={disabled}
        onPress={onToggle}
      >
        <Text
          numberOfLines={1}
          style={[styles.selectText, !selected && styles.placeholderText]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {open ? (
        <View style={styles.optionsPanel}>
          <View style={styles.selectSearch}>
            <Ionicons
              name="search-outline"
              size={17}
              color={colors.textSecondary}
            />
            <TextInput
              accessibilityLabel={`Buscar ${label.toLocaleLowerCase()}`}
              value={search}
              onChangeText={onSearchChange}
              placeholder={`Buscar ${label.toLocaleLowerCase()}`}
              placeholderTextColor="#94a3b8"
              style={styles.selectSearchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.optionsList}
          >
            {filtered.length ? (
              filtered.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.value === value }}
                  style={[
                    styles.optionRow,
                    option.value === value && styles.selectedOptionRow,
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onSearchChange("");
                    onToggle();
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      option.value === value && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.value === value ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={colors.primaryDark}
                    />
                  ) : null}
                </Pressable>
              ))
            ) : (
              <Text style={styles.noOptions}>Sin coincidencias.</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function EmrLinksScreen() {
  const { user } = useAuth();
  const [links, setLinks] = useState<EmrLink[]>([]);
  const [names, setNames] = useState<EmrOption[]>([]);
  const [prestations, setPrestations] = useState<PrestationOption[]>([]);
  const [specialties, setSpecialties] = useState<Especialidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<EmrLink | null>(null);
  const [form, setForm] = useState<LinkForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EmrLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [linkResult, namesResult, prestationResult, specialtyResult] =
      await Promise.allSettled([
        emrLinksService.getAll(),
        emrLinksService.getNames(),
        emrLinksService.getPrestations(),
        specialtyService.getSpecialties(),
      ]);
    const failures: string[] = [];

    if (linkResult.status === "fulfilled") setLinks(linkResult.value);
    else failures.push("los vínculos EMR");
    if (namesResult.status === "fulfilled") setNames(namesResult.value);
    else failures.push("los nombres EMR");
    if (prestationResult.status === "fulfilled") {
      setPrestations(prestationResult.value);
    } else failures.push("las prestaciones");
    if (specialtyResult.status === "fulfilled") {
      setSpecialties(specialtyResult.value);
    } else failures.push("las especialidades");

    setLoadError(
      failures.length
        ? `No se pudieron cargar ${failures.join(", ")}. Comprueba la conexión e intenta nuevamente.`
        : "",
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      await loadData();
      if (mounted) setIsLoading(false);
    };
    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const specialtyOptions = useMemo(
    () =>
      specialties.flatMap((specialty) => {
        const id = Number(specialty.option_id);
        return Number.isInteger(id) && id > 0
          ? [{ value: String(id), label: specialty.title }]
          : [];
      }),
    [specialties],
  );
  const selectedSpecialty = specialties.find(
    (item) => String(item.option_id) === form.specialtyId,
  );
  const availablePrestations = useMemo(() => {
    if (!form.specialtyId) return [];
    const selectedId = Number(form.specialtyId);
    const selectedName = normalized(selectedSpecialty?.title ?? "");
    return prestations.filter((prestation) => {
      if (prestation.specialtyId !== undefined) {
        return prestation.specialtyId === selectedId;
      }
      if (prestation.specialtyName) {
        return normalized(prestation.specialtyName) === selectedName;
      }
      return true;
    });
  }, [form.specialtyId, prestations, selectedSpecialty?.title]);
  const prestationOptions = useMemo(
    () =>
      availablePrestations.map((prestation) => ({
        value: String(prestation.id),
        label: prestation.name,
      })),
    [availablePrestations],
  );
  const emrOptions = useMemo(
    () => names.map((item) => ({ value: String(item.id), label: item.name })),
    [names],
  );

  const rows = useMemo(() => {
    const prestationById = new Map(prestations.map((item) => [item.id, item]));
    const emrById = new Map(names.map((item) => [item.id, item]));
    const specialtyByName = new Map(
      specialties.map((item) => [normalized(item.title), item.title]),
    );
    return links.map((link) => {
      const prestation = prestationById.get(link.categorie_id);
      const emr = emrById.get(link.emr_id);
      return {
        ...link,
        specialtyLabel:
          link.specialty_name ||
          (prestation?.specialtyName
            ? (specialtyByName.get(normalized(prestation.specialtyName)) ??
              prestation.specialtyName)
            : prestation?.specialtyId !== undefined
              ? specialties.find(
                  (item) => Number(item.option_id) === prestation.specialtyId,
                )?.title
              : undefined) ||
          "—",
        prestationLabel:
          link.prestation_name || prestation?.name || `ID ${link.categorie_id}`,
        emrLabel: link.emr_name || emr?.name || `ID ${link.emr_id}`,
      };
    });
  }, [links, names, prestations, specialties]);
  const filteredRows = useMemo(() => {
    const query = normalized(search);
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.specialtyLabel} ${row.prestationLabel} ${row.emrLabel} ${row.id}`
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE,
  );
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => {
      const start = Math.max(1, Math.min(visiblePage - 2, totalPages - 4));
      return start + index;
    },
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setNotice("");
    setNoticeIsError(false);
    setFormVisible(true);
    setPicker(null);
    setPickerSearch("");
  };

  const openEdit = (link: EmrLink) => {
    const prestation = prestations.find(
      (item) => item.id === link.categorie_id,
    );
    const specialty =
      specialties.find(
        (item) => Number(item.option_id) === prestation?.specialtyId,
      ) ??
      specialties.find(
        (item) =>
          normalized(item.title) ===
          normalized(link.specialty_name ?? prestation?.specialtyName ?? ""),
      );
    setEditing(link);
    setForm({
      specialtyId: specialty?.option_id ?? "",
      categorieId: String(link.categorie_id),
      emrId: String(link.emr_id),
    });
    setFormError("");
    setNotice("");
    setNoticeIsError(false);
    setFormVisible(true);
    setPicker(null);
    setPickerSearch("");
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormVisible(false);
    setPicker(null);
    setPickerSearch("");
  };

  const saveForm = async () => {
    setFormError("");
    setNotice("");
    setNoticeIsError(false);
    const specialtyId = Number(form.specialtyId);
    const categorieId = Number(form.categorieId);
    const emrId = Number(form.emrId);
    const userId = Number(user?.user_id);
    if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
      setFormError("Selecciona una especialidad.");
      return;
    }
    if (!Number.isInteger(categorieId) || categorieId <= 0) {
      setFormError("Selecciona una prestación.");
      return;
    }
    if (!Number.isInteger(emrId) || emrId <= 0) {
      setFormError("Selecciona un nombre EMR.");
      return;
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      setFormError("No se pudo identificar al usuario de la sesión.");
      return;
    }

    setIsSaving(true);
    try {
      const input = {
        categorie_id: categorieId,
        emr_id: emrId,
        user_id: userId,
      };
      if (editing) await emrLinksService.update(editing.id, input);
      else await emrLinksService.create(input);
      setFormVisible(false);
      setEditing(null);
      await loadData();
      setNotice(
        editing ? "Vínculo EMR actualizado." : "Vínculo EMR ingresado.",
      );
    } catch (error) {
      setFormError(
        errorMessage(
          error,
          editing
            ? "No se pudo actualizar el vínculo EMR."
            : "No se pudo ingresar el vínculo EMR.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setNotice("");
    try {
      await emrLinksService.delete(deleteTarget.id);
      setLinks((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      setNotice("Vínculo EMR eliminado.");
      setNoticeIsError(false);
    } catch (error) {
      setNotice(errorMessage(error, "No se pudo eliminar el vínculo EMR."));
      setNoticeIsError(true);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePicker = (kind: Exclude<PickerKind, null>) => {
    setPicker((current) => (current === kind ? null : kind));
    setPickerSearch("");
  };
  const refresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Cargando vínculos EMR…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
      >
        <ModuleBanner
          title="Vínculos EMR"
          subtitle="Relaciona prestaciones con los formularios EMR disponibles."
          icon="link-outline"
          eyebrow="CLÍNICA & MÉDICOS"
        />

        {loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={19} color="#b91c1c" />
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadData()}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}
        {notice ? (
          <View style={[styles.notice, noticeIsError && styles.noticeError]}>
            <Text
              style={[
                styles.noticeText,
                noticeIsError && styles.noticeErrorText,
              ]}
            >
              {notice}
            </Text>
            <Pressable
              accessibilityLabel="Cerrar mensaje"
              onPress={() => setNotice("")}
            >
              <Ionicons
                name="close"
                size={18}
                color={noticeIsError ? "#b91c1c" : "#047857"}
              />
            </Pressable>
          </View>
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
          <Text style={styles.createButtonText}>Ingresar nuevo vínculo</Text>
        </Pressable>

        {formVisible ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.formCard}>
              <View style={styles.formHeading}>
                <View>
                  <Text style={styles.formTitle}>
                    {editing ? "Editar vínculo" : "Nuevo vínculo"}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    Selecciona los datos que quedarán asociados.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar formulario"
                  onPress={closeForm}
                  disabled={isSaving}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <SearchableSelect
                label="Especialidad"
                placeholder="Buscar especialidad"
                value={form.specialtyId}
                options={specialtyOptions}
                search={picker === "specialty" ? pickerSearch : ""}
                onSearchChange={setPickerSearch}
                open={picker === "specialty"}
                onToggle={() => togglePicker("specialty")}
                disabled={!specialtyOptions.length}
                onSelect={(value) =>
                  setForm((current) => ({
                    ...current,
                    specialtyId: value,
                    categorieId: "",
                  }))
                }
              />
              <SearchableSelect
                label="Prestación"
                placeholder={
                  form.specialtyId
                    ? "Buscar prestación"
                    : "Primero selecciona una especialidad"
                }
                value={form.categorieId}
                options={prestationOptions}
                search={picker === "prestation" ? pickerSearch : ""}
                onSearchChange={setPickerSearch}
                open={picker === "prestation"}
                onToggle={() => togglePicker("prestation")}
                disabled={!form.specialtyId || !prestationOptions.length}
                onSelect={(value) =>
                  setForm((current) => ({ ...current, categorieId: value }))
                }
              />
              <SearchableSelect
                label="Nombre EMR"
                placeholder="Buscar nombre EMR"
                value={form.emrId}
                options={emrOptions}
                search={picker === "emr" ? pickerSearch : ""}
                onSearchChange={setPickerSearch}
                open={picker === "emr"}
                onToggle={() => togglePicker("emr")}
                disabled={!emrOptions.length}
                onSelect={(value) =>
                  setForm((current) => ({ ...current, emrId: value }))
                }
              />
              {!specialtyOptions.length ||
              !prestationOptions.length ||
              !emrOptions.length ? (
                <Text style={styles.catalogHint}>
                  {!specialtyOptions.length
                    ? "No hay especialidades cargadas."
                    : !prestationOptions.length && form.specialtyId
                      ? "No hay prestaciones disponibles para esta especialidad."
                      : !emrOptions.length
                        ? "No hay nombres EMR disponibles."
                        : ""}
                </Text>
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
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.submitButton,
                    isSaving && styles.disabledControl,
                  ]}
                  onPress={() => void saveForm()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : null}
                  <Text style={styles.submitText}>
                    {editing ? "Guardar" : "Ingresar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : null}

        <View style={styles.listHeading}>
          <View>
            <Text style={styles.sectionTitle}>Vínculos guardados</Text>
            <Text style={styles.countText}>
              {filteredRows.length}{" "}
              {filteredRows.length === 1 ? "registro" : "registros"}
            </Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.textSecondary}
          />
          <TextInput
            accessibilityLabel="Buscar vínculo"
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Buscar vínculo..."
            placeholderTextColor="#94a3b8"
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

        {visibleRows.length ? (
          visibleRows.map((row) => (
            <View key={row.id} style={styles.linkCard}>
              <View style={styles.linkCardHeader}>
                <View style={styles.linkIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color={colors.primaryDark}
                  />
                </View>
                <Text style={styles.recordNumber}>Vínculo #{row.id}</Text>
                <View style={styles.cardActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Editar vínculo"
                    style={styles.editAction}
                    onPress={() => openEdit(row)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.editActionText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar vínculo"
                    style={styles.deleteAction}
                    onPress={() => setDeleteTarget(row)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                    <Text style={styles.deleteActionText}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.cardDivider} />
              <RecordField label="Especialidad" value={row.specialtyLabel} />
              <RecordField label="Prestación" value={row.prestationLabel} />
              <RecordField label="Nombre EMR" value={row.emrLabel} />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name={search ? "search-outline" : "link-outline"}
              size={36}
              color="#94a3b8"
            />
            <Text style={styles.emptyTitle}>
              {search ? "Sin resultados" : "Aún no hay vínculos EMR"}
            </Text>
            <Text style={styles.stateText}>
              {search
                ? "Prueba con otro término de búsqueda."
                : "Ingresa un vínculo para comenzar."}
            </Text>
          </View>
        )}

        <View style={styles.pagination}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Página anterior"
            style={[
              styles.pageButton,
              visiblePage <= 1 && styles.pageButtonDisabled,
            ]}
            disabled={visiblePage <= 1}
            onPress={() => setPage(Math.max(1, visiblePage - 1))}
          >
            <Ionicons
              name="chevron-back"
              size={17}
              color={visiblePage <= 1 ? "#94a3b8" : colors.primaryDark}
            />
            <Text
              style={[
                styles.pageButtonText,
                visiblePage <= 1 && styles.disabledText,
              ]}
            >
              Anterior
            </Text>
          </Pressable>
          <View style={styles.pageNumbers}>
            {pageNumbers.map((number) => (
              <Pressable
                key={number}
                accessibilityRole="button"
                accessibilityLabel={`Página ${number}`}
                accessibilityState={{ selected: visiblePage === number }}
                style={[
                  styles.pageNumber,
                  visiblePage === number && styles.activePageNumber,
                ]}
                onPress={() => setPage(number)}
              >
                <Text
                  style={[
                    styles.pageNumberText,
                    visiblePage === number && styles.activePageNumberText,
                  ]}
                >
                  {number}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Página siguiente"
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
                visiblePage >= totalPages && styles.disabledText,
              ]}
            >
              Siguiente
            </Text>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={visiblePage >= totalPages ? "#94a3b8" : colors.primaryDark}
            />
          </Pressable>
        </View>
        <Text style={styles.pageSummary}>
          Página {visiblePage} de {totalPages}
        </Text>
      </ScrollView>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={24} color="#b91c1c" />
            </View>
            <Text style={styles.confirmTitle}>Eliminar vínculo EMR</Text>
            <Text style={styles.confirmText}>
              ¿Eliminar el vínculo de “
              {deleteTarget?.prestation_name ||
                `ID ${deleteTarget?.categorie_id}`}
              ”{deleteTarget?.emr_name ? ` con “${deleteTarget.emr_name}”` : ""}
              ? Esta acción es permanente.
            </Text>
            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.deleteConfirmButton,
                  isDeleting && styles.disabledControl,
                ]}
                onPress={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? (
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

function RecordField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordField}>
      <Text style={styles.recordLabel}>{label}</Text>
      <Text style={styles.recordValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 36 },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
  },
  stateText: {
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    gap: 8,
  },
  noticeError: { backgroundColor: "#fef2f2" },
  noticeText: { flex: 1, color: "#047857", fontSize: 13 },
  noticeErrorText: { color: "#b91c1c" },
  createButton: {
    backgroundColor: "#16a34a",
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 15,
  },
  createButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.86 },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 15,
    marginBottom: 18,
  },
  formHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  formTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  formSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  fieldGroup: { marginTop: 5, marginBottom: 8 },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
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
    gap: 8,
    backgroundColor: "#fff",
  },
  selectText: { flex: 1, color: colors.text, fontSize: 14 },
  placeholderText: { color: "#94a3b8" },
  disabledControl: { opacity: 0.55 },
  optionsPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  selectSearch: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  selectSearchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 9,
    fontSize: 14,
  },
  optionsList: { maxHeight: 180 },
  optionRow: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  selectedOptionRow: { backgroundColor: "#eff6ff" },
  optionText: { flex: 1, color: colors.text, fontSize: 13 },
  selectedOptionText: { color: colors.primaryDark, fontWeight: "700" },
  noOptions: { color: colors.textSecondary, fontSize: 13, padding: 14 },
  catalogHint: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  formError: { color: "#b91c1c", fontSize: 13, marginTop: 5 },
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
  listHeading: { marginTop: 2, marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  countText: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
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
  linkCard: {
    backgroundColor: colors.card,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  linkCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  recordNumber: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  editAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
  },
  editActionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  deleteAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
  },
  deleteActionText: { color: "#b91c1c", fontSize: 12, fontWeight: "700" },
  cardDivider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 10 },
  recordField: { marginBottom: 8 },
  recordLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.55,
  },
  recordValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 14,
  },
  pageButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  pageButtonDisabled: { opacity: 0.65 },
  pageButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  disabledText: { color: "#94a3b8" },
  pageNumbers: { flexDirection: "row", alignItems: "center", gap: 4 },
  pageNumber: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  activePageNumber: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  pageNumberText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  activePageNumberText: { color: "#fff" },
  pageSummary: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    justifyContent: "center",
    padding: 22,
  },
  confirmCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
