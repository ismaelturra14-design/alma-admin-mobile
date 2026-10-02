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

import { ModuleBanner } from "@/components/ui/ModuleBanner";
import { Pagination as SharedPagination } from "@/components/ui/PaginatedList";
import { PAGE_SIZE } from "@/constants/theme";
import { specialtyGroupsService } from "@/features/specialty-groups/services/specialtyGroupsService";
import { specialtyService } from "@/features/specialty-groups/services/specialtyService";
import type {
    Especialidad,
    EspecialidadGroup,
    EspecialidadLink,
} from "@/features/specialty-groups/types/especialidad";
import { colors } from "@/theme/colors";

type ActiveSection = "groups" | "links";
type FormKind = "group" | "link" | null;
type DeleteTarget =
  | { kind: "group"; id: number; label: string }
  | { kind: "link"; id: number; label: string }
  | null;
type SelectOption = { value: string; label: string };

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string") {
        return message;
      }
      if (Array.isArray(message)) {
        return message.filter((item) => typeof item === "string").join(" ");
      }
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
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
  disabled,
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
  disabled: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  const query = search.trim().toLocaleLowerCase();
  const filtered = query
    ? options.filter((option) =>
        option.label.toLocaleLowerCase().includes(query),
      )
    : options;

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.selectButton, disabled && styles.disabledControl]}
        disabled={disabled}
        onPress={onToggle}
      >
        <Text
          numberOfLines={1}
          style={[styles.selectButtonText, !selected && styles.placeholderText]}
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
        <View style={styles.selectOptionsContainer}>
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
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.selectOptions}
          >
            {filtered.length ? (
              filtered.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  style={styles.selectOption}
                  onPress={() => {
                    onSelect(option.value);
                    onSearchChange("");
                    onToggle();
                  }}
                >
                  <Text style={styles.selectOptionText}>{option.label}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.selectNoResults}>Sin coincidencias.</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function SpecialtyGroupingScreen() {
  const [groups, setGroups] = useState<EspecialidadGroup[]>([]);
  const [links, setLinks] = useState<EspecialidadLink[]>([]);
  const [specialties, setSpecialties] = useState<Especialidad[]>([]);
  const [section, setSection] = useState<ActiveSection>("groups");
  const [groupSearch, setGroupSearch] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  const [groupPage, setGroupPage] = useState(1);
  const [linkPage, setLinkPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [formKind, setFormKind] = useState<FormKind>(null);
  const [editingGroup, setEditingGroup] = useState<EspecialidadGroup | null>(
    null,
  );
  const [groupName, setGroupName] = useState("");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [specialtySelectOpen, setSpecialtySelectOpen] = useState(false);
  const [groupSelectOpen, setGroupSelectOpen] = useState(false);
  const [specialtySelectSearch, setSpecialtySelectSearch] = useState("");
  const [groupSelectSearch, setGroupSelectSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [groupResult, linkResult, specialtyResult] = await Promise.allSettled(
      [
        specialtyGroupsService.getGroups(),
        specialtyGroupsService.getLinks(),
        specialtyService.getSpecialties(),
      ],
    );
    const failures: string[] = [];

    if (groupResult.status === "fulfilled") {
      setGroups(groupResult.value);
    } else {
      failures.push("agrupaciones");
    }
    if (linkResult.status === "fulfilled") {
      setLinks(linkResult.value);
    } else {
      failures.push("vínculos");
    }
    if (specialtyResult.status === "fulfilled") {
      setSpecialties(specialtyResult.value);
    } else {
      failures.push("especialidades");
    }

    setLoadError("");
    if (failures.length) {
      setLoadError(
        `No se pudieron cargar ${failures.join(", ")}. Comprueba la conexión e intenta nuevamente.`,
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      await Promise.resolve();
      await loadData();
      if (mounted) {
        setIsLoading(false);
      }
    };
    void loadInitialData();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const filteredGroups = useMemo(() => {
    const query = groupSearch.trim().toLocaleLowerCase();
    return query
      ? groups.filter((group) => group.name.toLocaleLowerCase().includes(query))
      : groups;
  }, [groups, groupSearch]);

  const filteredLinks = useMemo(() => {
    const query = linkSearch.trim().toLocaleLowerCase();
    return query
      ? links.filter((link) =>
          `${link.specialty_name} ${link.group_name}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : links;
  }, [links, linkSearch]);

  const totalGroupPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / PAGE_SIZE),
  );
  const totalLinkPages = Math.max(
    1,
    Math.ceil(filteredLinks.length / PAGE_SIZE),
  );
  const pageGroups = filteredGroups.slice(
    (groupPage - 1) * PAGE_SIZE,
    groupPage * PAGE_SIZE,
  );
  const pageLinks = filteredLinks.slice(
    (linkPage - 1) * PAGE_SIZE,
    linkPage * PAGE_SIZE,
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupName("");
    setFormError("");
    setActionError("");
    setFormKind("group");
  };

  const openEditGroup = (group: EspecialidadGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setFormError("");
    setActionError("");
    setFormKind("group");
  };

  const openCreateLink = () => {
    setSelectedSpecialtyId("");
    setSelectedGroupId("");
    setSpecialtySelectSearch("");
    setGroupSelectSearch("");
    setSpecialtySelectOpen(false);
    setGroupSelectOpen(false);
    setFormError("");
    setActionError("");
    setFormKind("link");
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }
    setFormKind(null);
    setSpecialtySelectOpen(false);
    setGroupSelectOpen(false);
  };

  const saveForm = async () => {
    setFormError("");
    setActionError("");
    setNotice("");

    if (formKind === "group") {
      const cleanName = groupName.trim();
      if (!cleanName) {
        setFormError("El nombre de la agrupación es obligatorio.");
        return;
      }
      setIsSaving(true);
      try {
        if (editingGroup) {
          await specialtyGroupsService.updateGroup(editingGroup.id, {
            name: cleanName,
          });
          setNotice("Agrupación actualizada.");
        } else {
          await specialtyGroupsService.createGroup({ name: cleanName });
          setNotice("Agrupación creada.");
        }
        setFormKind(null);
        await loadData();
      } catch (error) {
        setFormError(errorMessage(error, "No se pudo guardar la agrupación."));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (formKind === "link") {
      const specialtyId = Number(selectedSpecialtyId);
      const groupId = Number(selectedGroupId);
      if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
        setFormError("Selecciona una especialidad válida.");
        return;
      }
      if (!Number.isInteger(groupId) || groupId <= 0) {
        setFormError("Selecciona una agrupación.");
        return;
      }
      setIsSaving(true);
      try {
        await specialtyGroupsService.createLink({
          specialty_id: specialtyId,
          group_id: groupId,
        });
        setNotice("Especialidad vinculada a la agrupación.");
        setFormKind(null);
        await loadData();
      } catch (error) {
        setFormError(errorMessage(error, "No se pudo crear el vínculo."));
      } finally {
        setIsSaving(false);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    const target = deleteTarget;
    setIsDeleting(true);
    setActionError("");
    setNotice("");
    try {
      if (target.kind === "group") {
        await specialtyGroupsService.deleteGroup(target.id);
        setNotice("Agrupación y sus vínculos eliminados.");
      } else {
        await specialtyGroupsService.deleteLink(target.id);
        setNotice("Vínculo eliminado.");
      }
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          target.kind === "group"
            ? "No se pudo eliminar la agrupación."
            : "No se pudo eliminar el vínculo.",
        ),
      );
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

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
  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({ value: String(group.id), label: group.name })),
    [groups],
  );

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateBody}>
          Cargando agrupaciones, vínculos y especialidades...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
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
          title="Agrupación de especialidades"
          subtitle="Administra agrupaciones y relaciones con el catálogo de especialidades."
          icon="albums-outline"
          eyebrow="CLÍNICA & MÉDICOS"
        />

        {loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadData()}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}
        {actionError ? (
          <Pressable
            style={styles.errorBanner}
            onPress={() => setActionError("")}
          >
            <Text style={styles.errorText}>{actionError}</Text>
          </Pressable>
        ) : null}
        {notice ? (
          <Pressable style={styles.successBanner} onPress={() => setNotice("")}>
            <Text style={styles.successText}>{notice}</Text>
            <Ionicons name="close" size={18} color={colors.success} />
          </Pressable>
        ) : null}

        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === "groups" }}
            style={[styles.tab, section === "groups" && styles.activeTab]}
            onPress={() => setSection("groups")}
          >
            <Ionicons
              name="albums-outline"
              size={17}
              color={
                section === "groups" ? colors.primaryDark : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                section === "groups" && styles.activeTabText,
              ]}
            >
              Agrupaciones
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: section === "links" }}
            style={[styles.tab, section === "links" && styles.activeTab]}
            onPress={() => setSection("links")}
          >
            <Ionicons
              name="git-compare-outline"
              size={17}
              color={
                section === "links" ? colors.primaryDark : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                section === "links" && styles.activeTabText,
              ]}
            >
              Vínculos
            </Text>
          </Pressable>
        </View>

        {section === "groups" ? (
          <View>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Agrupaciones</Text>
                <Text style={styles.sectionCaption}>
                  {filteredGroups.length}{" "}
                  {filteredGroups.length === 1 ? "grupo" : "grupos"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={openCreateGroup}
              >
                <Ionicons name="add" size={19} color="#fff" />
                <Text style={styles.primaryButtonText}>Nueva</Text>
              </Pressable>
            </View>
            <SearchInput
              label="Buscar agrupación"
              value={groupSearch}
              placeholder="Buscar agrupación"
              onChangeText={(value) => {
                setGroupSearch(value);
                setGroupPage(1);
              }}
              onClear={() => setGroupSearch("")}
            />
            {pageGroups.length ? (
              pageGroups.map((group) => (
                <View key={group.id} style={styles.groupCard}>
                  <View style={styles.groupIcon}>
                    <Ionicons
                      name="folder-open-outline"
                      size={20}
                      color={colors.primaryDark}
                    />
                  </View>
                  <View style={styles.groupDetails}>
                    <Text style={styles.groupName} numberOfLines={2}>
                      {group.name}
                    </Text>
                    <Text style={styles.groupMeta}>ID {group.id}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${group.name}`}
                    hitSlop={7}
                    style={styles.iconButton}
                    onPress={() => openEditGroup(group)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={colors.primaryDark}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${group.name}`}
                    hitSlop={7}
                    style={styles.iconButton}
                    onPress={() =>
                      setDeleteTarget({
                        kind: "group",
                        id: group.id,
                        label: group.name,
                      })
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.error}
                    />
                  </Pressable>
                </View>
              ))
            ) : (
              <EmptyState
                icon={groupSearch ? "search-outline" : "albums-outline"}
                title={
                  groupSearch ? "Sin resultados" : "Aún no hay agrupaciones"
                }
                body={
                  groupSearch
                    ? "Prueba con otra búsqueda."
                    : "Crea una agrupación para comenzar."
                }
              />
            )}
            <SharedPagination
              page={groupPage}
              totalItems={filteredGroups.length}
              onPageChange={setGroupPage}
            />
          </View>
        ) : (
          <View>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Vínculos</Text>
                <Text style={styles.sectionCaption}>
                  {filteredLinks.length}{" "}
                  {filteredLinks.length === 1 ? "relación" : "relaciones"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
                onPress={openCreateLink}
                disabled={!groups.length || !specialties.length}
              >
                <Ionicons name="link-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Vincular</Text>
              </Pressable>
            </View>
            <SearchInput
              label="Buscar vínculo"
              value={linkSearch}
              placeholder="Buscar especialidad o agrupación"
              onChangeText={(value) => {
                setLinkSearch(value);
                setLinkPage(1);
              }}
              onClear={() => setLinkSearch("")}
            />
            {pageLinks.length ? (
              pageLinks.map((link) => (
                <View key={link.id} style={styles.linkCard}>
                  <View style={styles.linkIcon}>
                    <Ionicons
                      name="git-compare-outline"
                      size={19}
                      color={colors.primaryDark}
                    />
                  </View>
                  <View style={styles.linkDetails}>
                    <Text style={styles.linkSpecialty} numberOfLines={2}>
                      {link.specialty_name}
                    </Text>
                    <View style={styles.linkGroupLine}>
                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.linkGroup} numberOfLines={1}>
                        {link.group_name}
                      </Text>
                    </View>
                    <Text style={styles.linkMeta}>Vínculo #{link.id}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Desvincular ${link.specialty_name} de ${link.group_name}`}
                    hitSlop={7}
                    style={styles.iconButton}
                    onPress={() =>
                      setDeleteTarget({
                        kind: "link",
                        id: link.id,
                        label: `${link.specialty_name} → ${link.group_name}`,
                      })
                    }
                  >
                    <Ionicons
                      name="unlink-outline"
                      size={20}
                      color={colors.error}
                    />
                  </Pressable>
                </View>
              ))
            ) : (
              <EmptyState
                icon={linkSearch ? "search-outline" : "git-compare-outline"}
                title={linkSearch ? "Sin resultados" : "Aún no hay vínculos"}
                body={
                  linkSearch
                    ? "Prueba con otra búsqueda."
                    : "Crea un vínculo entre una especialidad y una agrupación."
                }
              />
            )}
            <SharedPagination
              page={linkPage}
              totalItems={filteredLinks.length}
              onPageChange={setLinkPage}
            />
          </View>
        )}

        {section === "links" && (!groups.length || !specialties.length) ? (
          <View style={styles.helperBanner}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={colors.primaryDark}
            />
            <Text style={styles.helperText}>
              Para crear un vínculo se necesita al menos una agrupación y una
              especialidad disponible.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={formKind !== null}
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
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>
                  {formKind === "link"
                    ? "Crear vínculo"
                    : editingGroup
                      ? "Editar agrupación"
                      : "Nueva agrupación"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {formKind === "link"
                    ? "Elige una especialidad y su agrupación."
                    : "Ingresa el nombre de la agrupación."}
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
              nestedScrollEnabled
              contentContainerStyle={styles.formContent}
            >
              {formKind === "group" ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nombre de la agrupación</Text>
                  <TextInput
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholder="Ej. Especialidades médicas"
                    placeholderTextColor="#94a3b8"
                    maxLength={120}
                    autoCapitalize="sentences"
                    returnKeyType="done"
                    style={styles.textField}
                    editable={!isSaving}
                  />
                </View>
              ) : formKind === "link" ? (
                <>
                  <SearchableSelect
                    label="Especialidad"
                    placeholder="Selecciona una especialidad"
                    value={selectedSpecialtyId}
                    options={specialtyOptions}
                    search={specialtySelectSearch}
                    onSearchChange={setSpecialtySelectSearch}
                    onSelect={setSelectedSpecialtyId}
                    open={specialtySelectOpen}
                    onToggle={() => {
                      setSpecialtySelectOpen((value) => !value);
                      setGroupSelectOpen(false);
                    }}
                    disabled={isSaving}
                  />
                  <SearchableSelect
                    label="Agrupación"
                    placeholder="Selecciona una agrupación"
                    value={selectedGroupId}
                    options={groupOptions}
                    search={groupSelectSearch}
                    onSearchChange={setGroupSelectSearch}
                    onSelect={setSelectedGroupId}
                    open={groupSelectOpen}
                    onToggle={() => {
                      setGroupSelectOpen((value) => !value);
                      setSpecialtySelectOpen(false);
                    }}
                    disabled={isSaving}
                  />
                  {!specialtyOptions.length ? (
                    <Text style={styles.fieldHint}>
                      El catálogo tiene especialidades sin un option_id numérico
                      válido para el payload requerido.
                    </Text>
                  ) : null}
                </>
              ) : null}
              {formError ? (
                <Text style={styles.formError}>{formError}</Text>
              ) : null}
              <View style={styles.formActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={closeForm}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryButton,
                    isSaving && styles.disabledControl,
                  ]}
                  onPress={() => void saveForm()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : null}
                  <Text style={styles.primaryButtonText}>
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Text>
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
        onRequestClose={() => !isDeleting && setDeleteTarget(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="warning-outline" size={24} color={colors.error} />
            </View>
            <Text style={styles.confirmTitle}>
              {deleteTarget?.kind === "group"
                ? "Eliminar agrupación"
                : "Desvincular especialidad"}
            </Text>
            <Text style={styles.confirmBody}>
              {deleteTarget?.kind === "group"
                ? `¿Eliminar “${deleteTarget.label}”? El backend eliminará también todos sus vínculos en cascada.`
                : `¿Eliminar el vínculo “${deleteTarget?.label}”?`}
            </Text>
            <View style={styles.formActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.dangerButton,
                  isDeleting && styles.disabledControl,
                ]}
                onPress={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : null}
                <Text style={styles.dangerButtonText}>
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SearchInput({
  label,
  value,
  placeholder,
  onChangeText,
  onClear,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        returnKeyType="search"
        style={styles.searchInput}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          onPress={onClear}
        >
          <Ionicons
            name="close-circle"
            size={19}
            color={colors.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={34} color="#94a3b8" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e8eef3",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },
  activeTab: { backgroundColor: colors.card, elevation: 1 },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  activeTabText: { color: colors.primaryDark },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  sectionHeading: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" },
  sectionCaption: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  primaryButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  dangerButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dangerButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.8 },
  disabledControl: { opacity: 0.55 },
  searchBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eaf5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  groupDetails: { flex: 1 },
  groupName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  groupMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  iconButton: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  linkCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#eaf5fb",
    alignItems: "center",
    justifyContent: "center",
  },
  linkDetails: { flex: 1 },
  linkSpecialty: { color: colors.text, fontSize: 14, fontWeight: "700" },
  linkGroupLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  linkGroup: { flexShrink: 1, color: colors.textSecondary, fontSize: 13 },
  linkMeta: { color: "#94a3b8", fontSize: 10, marginTop: 4 },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 5,
    textAlign: "center",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    paddingVertical: 10,
  },
  pageButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pageButtonDisabled: { opacity: 0.55 },
  pageLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  retryText: { color: colors.primaryDark, fontWeight: "700" },
  successBanner: {
    backgroundColor: colors.successBackground,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  helperBanner: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  helperText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  formModal: {
    maxHeight: "90%",
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  modalHeading: { flex: 1, paddingRight: 12 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  formContent: { paddingBottom: 6, gap: 15 },
  fieldGroup: { gap: 7 },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
  textField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.card,
  },
  selectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectButtonText: { flex: 1, color: colors.text, fontSize: 14 },
  placeholderText: { color: "#94a3b8" },
  selectOptionsContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  selectSearch: {
    minHeight: 42,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  selectSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 8,
  },
  selectOptions: { maxHeight: 170 },
  selectOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  selectOptionText: { color: colors.text, fontSize: 14 },
  selectNoResults: { color: colors.textSecondary, fontSize: 13, padding: 12 },
  fieldHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  formError: { color: colors.error, fontSize: 13, lineHeight: 19 },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  confirmCard: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  confirmBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 16,
  },
});
