import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { PERMISSIONS } from "@/constants/permissions";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
    rolePermissionsService,
    type GroupedPermissions,
} from "@/features/role-permissions/services/rolePermissionsService";
import type {
    SystemUser,
    UserCatalogs,
    UserCategory,
} from "@/features/users/types/users";
import { resolveAssetUri } from "@/features/users/utils/resolveAssetUri";
import { colors } from "@/theme/colors";
import { usersService } from "../services/usersService";

type UserDetailScreenProps = {
  user: SystemUser;
  catalogs: UserCatalogs;
  photoRefreshToken: number;
  onBack: () => void;
};

function isEnabled(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function textValue(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }
  return String(value).trim();
}

function getDisplayName(user: SystemUser): string {
  return (
    [user.fname, user.mname, user.lname].filter(Boolean).join(" ").trim() ||
    user.username ||
    "Usuario sin nombre"
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "No se pudo cargar el detalle del usuario.";
}

function normalizedText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export function UserDetailScreen({
  user,
  catalogs,
  photoRefreshToken,
  onBack,
}: UserDetailScreenProps) {
  const { hasPermission } = useAuth();
  const canViewGroupPermissions = hasPermission(
    PERMISSIONS.VIEW_PERMISSION_MAINTAINER,
  );
  const [detail, setDetail] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignedCategories, setAssignedCategories] = useState<UserCategory[]>([]);
  const [assignedCategoriesExpanded, setAssignedCategoriesExpanded] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [specialtyCategories, setSpecialtyCategories] = useState<UserCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [groupedPermissions, setGroupedPermissions] =
    useState<GroupedPermissions>({});
  const [groupPermissionIds, setGroupPermissionIds] = useState<number[]>([]);
  const [permissionsExpanded, setPermissionsExpanded] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [permissionGroupLoadedFor, setPermissionGroupLoadedFor] = useState<
    string | null
  >(null);
  const [permissionRetry, setPermissionRetry] = useState(0);

  const loadDetail = useCallback(async () => {
    setError("");
    try {
      const nextUser = await usersService.getUser(user.id);
      setDetail(nextUser);
      const nextCategories = await usersService.getUserCategories(user.id);
      setAssignedCategories(nextCategories);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const loadAssignedCategories = useCallback(async () => {
    const categories = await usersService.getUserCategories(user.id);
    setAssignedCategories(categories);
    return categories;
  }, [user.id]);

  const loadSpecialtyCategories = useCallback(
    async (specialtyId: string) => {
      const parsedId = Number(specialtyId);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        setSpecialtyCategories([]);
        return;
      }

      setAssignmentLoading(true);
      try {
        const specialtyName =
          catalogs.specialties.find(
            (specialty) => String(specialty.option_id) === specialtyId,
          )?.title ?? "";
        const result = await usersService.getSpecialtyCategories(
          parsedId,
          specialtyName,
        );
        setSpecialtyCategories(result);
      } catch (requestError) {
        setAssignmentError(
          getErrorMessage(requestError) ||
            "No se pudieron cargar las prestaciones de esta especialidad.",
        );
      } finally {
        setAssignmentLoading(false);
      }
    },
    [catalogs.specialties],
  );

  const currentUser = detail ?? user;

  useEffect(() => {
    let isMounted = true;
    void usersService
      .getUser(user.id)
      .then(async (result) => {
        if (!isMounted) {
          return;
        }
        setDetail(result);
        try {
          const nextCategories = await usersService.getUserCategories(user.id);
          if (isMounted) {
            setAssignedCategories(nextCategories);
          }
        } catch (requestError) {
          if (isMounted) {
            setError(getErrorMessage(requestError));
          }
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  useEffect(() => {
    if (!assignmentModalOpen) {
      return;
    }

    let activeRequest = true;
    const refreshAssignmentData = async () => {
      setAssignmentError("");
      setAssignmentLoading(true);
      try {
        const categories = await loadAssignedCategories();
        const nextSelection = categories
          .map((category) => Number(category.id))
          .filter((value) => Number.isInteger(value) && value > 0);
        if (!activeRequest) {
          return;
        }

        setSelectedCategoryIds(nextSelection);
        const preferredSpecialty =
          textValue(currentUser.specialty) ||
          catalogs.specialties[0]?.option_id ||
          "";
        setSelectedSpecialtyId(preferredSpecialty);
        if (preferredSpecialty) {
          await loadSpecialtyCategories(preferredSpecialty);
        }
      } catch (requestError) {
        if (activeRequest) {
          setAssignmentError(
            getErrorMessage(requestError) ||
              "No se pudieron cargar las prestaciones del usuario.",
          );
        }
      } finally {
        if (activeRequest) {
          setAssignmentLoading(false);
        }
      }
    };

    void refreshAssignmentData();
    return () => {
      activeRequest = false;
    };
  }, [assignmentModalOpen, catalogs.specialties, currentUser.specialty, loadAssignedCategories, loadSpecialtyCategories]);
  const photoUri = resolveAssetUri(
    currentUser.foto_url ?? currentUser.foto ?? "",
  );
  const active = isEnabled(currentUser.active);
  const authorized = isEnabled(currentUser.authorized);
  const hasAuthorization =
    currentUser.authorized !== undefined && currentUser.authorized !== null;
  const groupId = textValue(currentUser.user_group);
  const groupName =
    catalogs.groups.find((group) => group.id === groupId)?.label ?? groupId;
  const numericGroupId = Number(groupId);
  const hasValidGroup = Number.isInteger(numericGroupId) && numericGroupId > 0;
  const permissionsLoading =
    canViewGroupPermissions &&
    permissionsExpanded &&
    hasValidGroup &&
    permissionGroupLoadedFor !== groupId;

  useEffect(() => {
    if (!canViewGroupPermissions || !hasValidGroup || !permissionsExpanded) {
      return;
    }

    let isMounted = true;
    void Promise.all([
      rolePermissionsService.getGroupPermissionIds(numericGroupId),
      rolePermissionsService.getGroupedPermissions(),
    ])
      .then(([permissionIds, permissions]) => {
        if (!isMounted) {
          return;
        }
        setGroupPermissionIds(permissionIds);
        setGroupedPermissions(permissions);
        setPermissionError("");
        setPermissionGroupLoadedFor(groupId);
      })
      .catch((requestError: unknown) => {
        if (!isMounted) {
          return;
        }
        setPermissionError(
          requestError instanceof Error && requestError.message
            ? requestError.message
            : "No se pudieron cargar los permisos del grupo.",
        );
        setPermissionGroupLoadedFor(groupId);
      });

    return () => {
      isMounted = false;
    };
  }, [
    canViewGroupPermissions,
    groupId,
    hasValidGroup,
    numericGroupId,
    permissionsExpanded,
    permissionRetry,
  ]);

  const grantedPermissionIds = new Set(groupPermissionIds);
  const grantedPermissionSections = Object.entries(groupedPermissions)
    .map(([moduleName, permissions]) => ({
      moduleName,
      permissions: permissions.filter((permission) =>
        grantedPermissionIds.has(permission.id),
      ),
    }))
    .filter((section) => section.permissions.length > 0);
  const specialtyId = textValue(currentUser.specialty);
  const specialtyName =
    catalogs.specialties.find((specialty) => specialty.option_id === specialtyId)
      ?.title ?? specialtyId;
  const specialties = (currentUser.especialidades ?? [])
    .map((id) => {
      const value = String(id);
      return (
        catalogs.specialties.find((specialty) => specialty.option_id === value)
          ?.title ?? value
      );
    })
    .join(", ");
  const facilities = (currentUser.facility_id ?? [])
    .map((id) => {
      const value = Number(id);
      return (
        catalogs.facilities.find((facility) => facility.id === value)?.name ??
        String(id)
      );
    })
    .join(", ");
  const stateId = textValue(currentUser.state);
  const cityId = textValue(currentUser.city);
  const regionName =
    catalogs.regions.find((region) => String(region.id_region) === stateId)
      ?.region ?? stateId;
  const communeName =
    catalogs.communes.find((commune) => String(commune.id) === cityId)?.nombre ??
    cityId;
  const location = [communeName, regionName].filter(Boolean).join(", ");
  const assignmentHasChanges = (() => {
    const originalIds = new Set(assignedCategories.map((category) => Number(category.id)));
    const nextIds = new Set(selectedCategoryIds);
    if (originalIds.size !== nextIds.size) {
      return true;
    }
    return [...originalIds].some((id) => !nextIds.has(id));
  })();

  const filteredSpecialtyCategories = specialtyCategories.filter((category) => {
    const query = normalizedText(categoryQuery);
    if (!query) {
      return true;
    }
    const haystack = normalizedText(
      `${category.nombre ?? ""} ${category.codigo ?? ""}`,
    );
    return haystack.includes(query);
  });

  const toggleCategorySelection = (categoryId: number) => {
    setSelectedCategoryIds((current) => {
      if (current.includes(categoryId)) {
        return current.filter((value) => value !== categoryId);
      }
      return [...current, categoryId];
    });
  };

  const saveAssignments = async () => {
    if (!active) {
      setAssignmentError(
        "El usuario está desactivado y no puede gestionar prestaciones.",
      );
      return;
    }

    if (!assignmentHasChanges) {
      return;
    }

    setSavingAssignments(true);
    setAssignmentError("");

    try {
      await usersService.updateUserCategories(user.id, selectedCategoryIds);
      await loadDetail();
      const refreshedCategories = await loadAssignedCategories();
      setSelectedCategoryIds(
        refreshedCategories
          .map((category) => Number(category.id))
          .filter((value) => Number.isInteger(value) && value > 0),
      );
      setAssignmentModalOpen(false);
    } catch (requestError) {
      setAssignmentError(
        getErrorMessage(requestError) ||
          "Ocurrió un error al intentar actualizar las prestaciones.",
      );
    } finally {
      setSavingAssignments(false);
    }
  };

  const sections = [
    {
      title: "Acceso",
      icon: "key-outline" as const,
      rows: [
        { label: "Usuario", value: textValue(currentUser.username) },
        { label: "Grupo", value: groupName || "Sin grupo asignado" },
        { label: "Rol ERx", value: textValue(currentUser.erxrole) },
        {
          label: "Autorización",
          value: hasAuthorization
            ? authorized
              ? "Autorizado"
              : "No autorizado"
            : "",
        },
      ],
    },
    {
      title: "Contacto",
      icon: "chatbubble-ellipses-outline" as const,
      rows: [
        { label: "Correo", value: textValue(currentUser.email) },
        { label: "Teléfono", value: textValue(currentUser.phonecell) },
      ],
    },
    {
      title: "Perfil",
      icon: "person-outline" as const,
      rows: [
        { label: "RUT", value: textValue(currentUser.federaltaxid) },
        {
          label: "Fecha de nacimiento",
          value: textValue(currentUser.birthday).slice(0, 10),
        },
        { label: "Especialidad", value: specialtyName },
        { label: "Otras especialidades", value: specialties },
      ],
    },
    {
      title: "Ubicación e información",
      icon: "location-outline" as const,
      rows: [
        { label: "Establecimientos", value: facilities },
        { label: "Dirección", value: textValue(currentUser.street) },
        { label: "Comuna / Región", value: location },
        { label: "Información", value: textValue(currentUser.info) },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => row.value),
    }))
    .filter((section) => section.rows.length > 0);

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al listado de usuarios"
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>MANTENEDOR DE USUARIOS</Text>
          <Text style={styles.headerTitle}>Detalle del usuario</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Actualizando información…</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={19} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                void loadDetail();
              }}
              disabled={loading}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.profile}>
          {photoUri ? (
            <Image
              key={photoRefreshToken}
              source={{ uri: photoUri }}
              cachePolicy="none"
              contentFit="cover"
              style={styles.profileImage}
              accessibilityLabel={`Foto de ${getDisplayName(currentUser)}`}
            />
          ) : null}
          <View style={styles.profileCopy}>
            <Text style={styles.username} numberOfLines={1}>
              @{currentUser.username}
            </Text>
            <Text style={styles.name}>{getDisplayName(currentUser)}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusPill, active ? styles.activePill : styles.inactivePill]}>
                <View style={[styles.statusDot, active ? styles.activeDot : styles.inactiveDot]} />
                <Text style={[styles.statusText, active ? styles.activeText : styles.inactiveText]}>
                  {active ? "Activo" : "Inactivo"}
                </Text>
              </View>
              {hasAuthorization ? (
                <View style={[styles.statusPill, authorized ? styles.authorizedPill : styles.inactivePill]}>
                  <Text style={[styles.statusText, authorized ? styles.authorizedText : styles.inactiveText]}>
                    {authorized ? "Autorizado" : "No autorizado"}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>Roles y permisos</Text>
            {canViewGroupPermissions && hasValidGroup ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${permissionsExpanded ? "Ocultar" : "Desplegar"} roles y permisos`}
                accessibilityState={{ expanded: permissionsExpanded }}
                onPress={() =>
                  setPermissionsExpanded((expanded) => !expanded)
                }
                style={styles.permissionToggle}
              >
                {permissionGroupLoadedFor === groupId && !permissionError ? (
                  <Text style={styles.permissionModuleCount}>
                    {groupPermissionIds.length}
                  </Text>
                ) : null}
                <Text style={styles.permissionToggleText}>
                  {permissionsExpanded ? "Ocultar" : "Ver"}
                </Text>
                <Ionicons
                  name={permissionsExpanded ? "chevron-up" : "chevron-down"}
                  size={17}
                  color={detailColors.green}
                />
              </Pressable>
            ) : null}
          </View>

          {!canViewGroupPermissions ? (
            <Text style={styles.permissionState}>
              No tienes permiso para consultar los permisos del grupo.
            </Text>
          ) : !hasValidGroup ? (
            <Text style={styles.permissionState}>
              El usuario no tiene un grupo asignado.
            </Text>
          ) : !permissionsExpanded ? null : permissionsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando permisos del grupo…</Text>
            </View>
          ) : permissionError ? (
            <View style={styles.permissionErrorRow}>
              <Text style={styles.permissionErrorText}>{permissionError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPermissionError("");
                  setPermissionGroupLoadedFor(null);
                  setPermissionRetry((attempt) => attempt + 1);
                }}
                style={styles.permissionRetry}
              >
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : grantedPermissionSections.length ? (
            <View style={styles.permissionSections}>
              {grantedPermissionSections.map((section) => (
                <View key={section.moduleName} style={styles.permissionModule}>
                  <View style={styles.permissionModuleHeading}>
                    <Text style={styles.permissionModuleTitle}>
                      {section.moduleName}
                    </Text>
                    <Text style={styles.permissionModuleCount}>
                      {section.permissions.length}
                    </Text>
                  </View>
                  {section.permissions.map((permission) => (
                    <View key={permission.id} style={styles.permissionItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={detailColors.success}
                      />
                      <View style={styles.permissionCopy}>
                        <Text style={styles.permissionName}>
                          {permission.name}
                        </Text>
                        {permission.description ? (
                          <Text style={styles.permissionDescription}>
                            {permission.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.permissionState}>
              El grupo {groupName} no tiene permisos asignados.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="medkit-outline" size={17} color={colors.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>Prestaciones</Text>
            <View style={styles.assignmentCount}>
              <Text style={styles.assignmentCountText}>{assignedCategories.length}</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Asignar o editar prestaciones del usuario"
            style={[styles.assignmentAction, !active && styles.inlineActionDisabled]}
            onPress={() => {
              if (!active) {
                setAssignmentError(
                  "El usuario está desactivado y no puede gestionar prestaciones.",
                );
                return;
              }
              setAssignmentModalOpen(true);
            }}
            disabled={!active}
          >
            <Ionicons name="add-circle-outline" size={19} color="#fff" />
            <Text style={styles.assignmentActionText}>
              {active ? "Asignar o editar prestaciones" : "Usuario inactivo"}
            </Text>
            <Ionicons name="chevron-forward" size={17} color="#fff" />
          </Pressable>
          {!active ? (
            <Text style={styles.assignmentDisabledHint}>
              Activa al usuario para poder asignar o editar prestaciones.
            </Text>
          ) : null}

          {assignedCategories.length ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: assignedCategoriesExpanded }}
                accessibilityLabel={`${assignedCategoriesExpanded ? "Ocultar" : "Ver"} ${assignedCategories.length} prestaciones asignadas`}
                style={styles.assignedToggle}
                onPress={() => setAssignedCategoriesExpanded((expanded) => !expanded)}
              >
                <View style={styles.assignedToggleCopy}>
                  <Text style={styles.assignedToggleTitle}>Prestaciones asignadas</Text>
                  <Text style={styles.assignedToggleMeta}>
                    {assignedCategories.length} {assignedCategories.length === 1 ? "prestación" : "prestaciones"}
                  </Text>
                </View>
                <Ionicons
                  name={assignedCategoriesExpanded ? "chevron-up" : "chevron-down"}
                  size={19}
                  color={detailColors.green}
                />
              </Pressable>
              {assignedCategoriesExpanded ? (
                <View style={styles.assignmentList}>
                  {assignedCategories.map((category) => (
                    <View key={category.id} style={styles.assignmentItem}>
                      <Text style={styles.assignmentItemText}>
                        {category.nombre || "Sin nombre"}
                      </Text>
                      {category.codigo ? (
                        <Text style={styles.assignmentItemMeta}>{category.codigo}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyAssignmentText}>Aún no tiene prestaciones asignadas.</Text>
          )}
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Ionicons name={section.icon} size={17} color={colors.primaryDark} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionRows}>
              {section.rows.map((row) => (
                <View key={row.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text selectable style={styles.detailValue}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={assignmentModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignmentModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.assignmentModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Prestaciones</Text>
                <Text style={styles.modalTitle}>Asignar prestación</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal de prestaciones"
                onPress={() => setAssignmentModalOpen(false)}
                disabled={savingAssignments}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {assignmentError ? (
              <View style={styles.assignmentAlert}>
                <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
                <Text style={styles.assignmentAlertText}>{assignmentError}</Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Especialidad</Text>
            <ScrollView
              style={styles.specialtyPicker}
              contentContainerStyle={styles.specialtyPickerContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {catalogs.specialties.length ? (
                catalogs.specialties.map((specialty) => (
                  <Pressable
                    key={specialty.option_id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedSpecialtyId === specialty.option_id }}
                    style={[
                      styles.specialtyChip,
                      selectedSpecialtyId === specialty.option_id && styles.specialtyChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedSpecialtyId(String(specialty.option_id));
                      setCategoryQuery("");
                      void loadSpecialtyCategories(String(specialty.option_id));
                    }}
                  >
                    <View style={styles.specialtyChipContent}>
                      <Text
                        style={[
                          styles.specialtyChipLabel,
                          selectedSpecialtyId === specialty.option_id &&
                            styles.specialtyChipLabelSelected,
                        ]}
                      >
                        {specialty.title}
                      </Text>
                      {selectedSpecialtyId === specialty.option_id ? (
                        <Ionicons name="checkmark-circle" size={17} color={detailColors.green} />
                      ) : null}
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyAssignmentText}>No hay especialidades disponibles.</Text>
              )}
            </ScrollView>

            {selectedSpecialtyId ? (
              <View style={styles.categorySearchBox}>
                <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
                <TextInput
                  accessibilityLabel="Buscar prestación"
                  value={categoryQuery}
                  onChangeText={setCategoryQuery}
                  placeholder="Buscar prestación"
                  placeholderTextColor="#94a3b8"
                  style={styles.categorySearchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ) : null}

            {assignmentLoading ? (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando prestaciones…</Text>
              </View>
            ) : null}

            {!assignmentLoading && selectedSpecialtyId ? (
              <ScrollView style={styles.assignmentListModal} keyboardShouldPersistTaps="handled">
                {filteredSpecialtyCategories.length ? (
                  filteredSpecialtyCategories.map((category) => {
                    const isSelected = selectedCategoryIds.includes(Number(category.id));
                    return (
                      <Pressable
                        key={category.id}
                        accessibilityRole="button"
                        style={[
                          styles.assignmentOption,
                          isSelected && styles.assignmentOptionSelected,
                        ]}
                        onPress={() => {
                          toggleCategorySelection(Number(category.id));
                        }}
                      >
                        <View style={styles.assignmentTextWrap}>
                          <Text style={styles.assignmentOptionTitle}>
                            {category.nombre || "Sin nombre"}
                          </Text>
                          {category.codigo ? (
                            <Text style={styles.assignmentOptionMeta}>{category.codigo}</Text>
                          ) : null}
                        </View>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                          size={22}
                          color={isSelected ? colors.primaryDark : colors.textSecondary}
                        />
                      </Pressable>
                    );
                  })
                ) : (
                  <Text style={styles.emptyAssignmentText}>
                    No hay prestaciones disponibles para esta especialidad.
                  </Text>
                )}
              </ScrollView>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setAssignmentModalOpen(false)}
                disabled={savingAssignments}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  (!assignmentHasChanges || savingAssignments) && styles.submitButtonDisabled,
                ]}
                onPress={() => void saveAssignments()}
                disabled={!assignmentHasChanges || savingAssignments}
              >
                {savingAssignments ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Guardar cambios</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const detailColors = {
  canvas: "#F1F4F2",
  surface: "#FFFFFF",
  ink: "#183B37",
  text: "#294540",
  muted: "#74847F",
  line: "#DCE6E1",
  green: "#1D6A5E",
  greenSoft: "#E4F0EA",
  success: "#28764F",
  successSoft: "#E5F2E9",
  neutralSoft: "#EDF1EF",
  warm: "#9B653C",
  warmSoft: "#F5EDE2",
  error: "#A9443D",
  errorSoft: "#FBEEEC",
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    backgroundColor: detailColors.canvas,
  },
  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: detailColors.line,
    backgroundColor: detailColors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: detailColors.line,
    borderRadius: 12,
    backgroundColor: detailColors.greenSoft,
  },
  headerCopy: { flex: 1 },
  headerEyebrow: {
    marginBottom: 2,
    color: detailColors.green,
    fontSize: 9,
    fontWeight: "800",
  },
  headerTitle: {
    color: detailColors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: { color: detailColors.muted, fontSize: 12 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: "#EBC9C4",
    borderRadius: 10,
    backgroundColor: detailColors.errorSoft,
  },
  errorText: {
    flex: 1,
    color: detailColors.error,
    fontSize: 12,
    lineHeight: 17,
  },
  retryText: {
    color: detailColors.green,
    fontSize: 12,
    fontWeight: "700",
  },
  profile: {
    alignItems: "center",
    marginBottom: 2,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "#CFDED6",
    borderRadius: 8,
    backgroundColor: detailColors.greenSoft,
  },
  profileImage: {
    width: 156,
    height: 172,
    marginBottom: 12,
    borderWidth: 4,
    borderColor: detailColors.surface,
    borderRadius: 12,
    backgroundColor: detailColors.surface,
  },
  profileCopy: { width: "100%", alignItems: "center" },
  username: {
    marginBottom: 4,
    color: detailColors.green,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  name: {
    color: detailColors.ink,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  statusPill: {
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activePill: { backgroundColor: detailColors.successSoft },
  inactivePill: { backgroundColor: detailColors.neutralSoft },
  authorizedPill: { backgroundColor: "#E7ECE7" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  activeDot: { backgroundColor: detailColors.success },
  inactiveDot: { backgroundColor: detailColors.muted },
  statusText: { fontSize: 11, fontWeight: "700" },
  activeText: { color: detailColors.success },
  inactiveText: { color: detailColors.muted },
  authorizedText: { color: detailColors.green },
  section: {
    marginTop: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: detailColors.line,
    borderRadius: 8,
    backgroundColor: detailColors.surface,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 9,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: detailColors.warmSoft,
  },
  sectionTitle: {
    color: detailColors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionRows: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: detailColors.line,
  },
  detailLabel: {
    marginBottom: 3,
    color: detailColors.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: { color: detailColors.text, fontSize: 14, lineHeight: 20 },
  permissionToggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  permissionToggleText: {
    color: detailColors.green,
    fontSize: 12,
    fontWeight: "700",
  },
  permissionState: {
    paddingHorizontal: 14,
    paddingBottom: 13,
    color: detailColors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  permissionErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  permissionErrorText: {
    flex: 1,
    color: detailColors.error,
    fontSize: 12,
    lineHeight: 17,
  },
  permissionRetry: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  permissionSections: { paddingHorizontal: 14, paddingBottom: 8 },
  permissionModule: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: detailColors.line,
  },
  permissionModuleHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 5,
  },
  permissionModuleTitle: {
    flex: 1,
    color: detailColors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  permissionModuleCount: {
    color: detailColors.green,
    fontSize: 11,
    fontWeight: "700",
  },
  permissionItem: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 5,
  },
  permissionCopy: { flex: 1 },
  permissionName: { color: detailColors.text, fontSize: 13, lineHeight: 18 },
  permissionDescription: {
    marginTop: 2,
    color: detailColors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  inlineActionDisabled: {
    opacity: 0.5,
  },
  assignmentCount: {
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: detailColors.greenSoft,
  },
  assignmentCountText: {
    color: detailColors.green,
    fontSize: 12,
    fontWeight: "800",
  },
  assignmentAction: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: detailColors.green,
  },
  assignmentActionText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  assignmentDisabledHint: {
    marginHorizontal: 14,
    marginBottom: 10,
    color: "#b91c1c",
    fontSize: 11,
    lineHeight: 16,
  },
  assignedToggle: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: detailColors.line,
    borderRadius: 10,
    backgroundColor: detailColors.canvas,
  },
  assignedToggleCopy: {
    flex: 1,
    gap: 2,
  },
  assignedToggleTitle: {
    color: detailColors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  assignedToggleMeta: {
    color: detailColors.muted,
    fontSize: 11,
  },
  assignmentList: {
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 14,
  },
  assignmentItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: detailColors.neutralSoft,
    borderWidth: 1,
    borderColor: detailColors.line,
  },
  assignmentItemText: {
    color: detailColors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  assignmentItemMeta: {
    marginTop: 4,
    color: detailColors.muted,
    fontSize: 11,
  },
  emptyAssignmentText: {
    color: detailColors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    paddingHorizontal: 12,
  },
  assignmentModal: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    backgroundColor: detailColors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalEyebrow: {
    color: colors.primaryDark,
    fontSize: 10,
    letterSpacing: 1.1,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  modalTitle: {
    color: detailColors.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  fieldLabel: {
    color: detailColors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  specialtyPicker: {
    maxHeight: 160,
    flexGrow: 0,
    marginBottom: 12,
  },
  specialtyPickerContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 4,
  },
  specialtyChip: {
    minHeight: 48,
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: detailColors.line,
    backgroundColor: detailColors.neutralSoft,
  },
  specialtyChipSelected: {
    backgroundColor: detailColors.greenSoft,
    borderColor: detailColors.green,
  },
  specialtyChipContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  specialtyChipLabel: {
    flex: 1,
    color: detailColors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  specialtyChipLabelSelected: {
    color: detailColors.green,
  },
  categorySearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: detailColors.line,
    backgroundColor: detailColors.canvas,
    marginBottom: 12,
  },
  categorySearchInput: {
    flex: 1,
    minHeight: 42,
    color: detailColors.ink,
    fontSize: 14,
  },
  assignmentListModal: {
    maxHeight: 240,
    minHeight: 180,
    marginBottom: 12,
  },
  assignmentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: detailColors.line,
    backgroundColor: detailColors.surface,
    marginBottom: 8,
  },
  assignmentOptionSelected: {
    borderColor: detailColors.green,
    backgroundColor: detailColors.greenSoft,
  },
  assignmentTextWrap: { flex: 1 },
  assignmentOptionTitle: {
    color: detailColors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  assignmentOptionMeta: {
    marginTop: 3,
    color: detailColors.muted,
    fontSize: 11,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: detailColors.line,
    backgroundColor: detailColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: detailColors.text,
    fontWeight: "700",
  },
  submitButton: {
    flex: 1.2,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
  },
  assignmentAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: detailColors.errorSoft,
    marginBottom: 10,
  },
  assignmentAlertText: {
    flex: 1,
    color: detailColors.error,
    fontSize: 12,
    lineHeight: 18,
  },
  modalLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
});