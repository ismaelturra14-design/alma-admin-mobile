import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { ENV } from "@/config/env";
import { colors } from "@/theme/colors";
import type { UserAsset, UserCatalogs, UserFormValues } from "@/features/users/types/users";
import type {
    UserFormErrors,
    UserFormField,
    UserFormMode,
} from "@/features/users/utils/userValidation";

type UserFormModalProps = {
  visible: boolean;
  mode: UserFormMode;
  form: UserFormValues;
  catalogs: UserCatalogs;
  errors: UserFormErrors;
  saving: boolean;
  formMessage: string;
  catalogMessage: string;
  catalogLoading: boolean;
  loadingDetail: boolean;
  detailError: string;
  onChange: (
    field: UserFormField,
    value: UserFormValues[UserFormField],
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRetryDetail: () => void;
  onRetryCatalogs: () => void;
};

type Option = { value: string; label: string };

function resolveAssetUri(value: string): string {
  const trimmed = value.trim().replace(/&amp;/gi, "&").replace(/\\/g, "/");
  if (!trimmed) {
    return "";
  }

  // Keep real remote URLs and picker-created local URIs. A file URI returned
  // from the server is not a device file: it can point into the iOS app bundle.
  if (
    /^https?:\/\//i.test(trimmed) ||
    /^(content:|data:|blob:)/i.test(trimmed)
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  let path = trimmed;
  if (/^file:/i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      path = path.replace(/^file:\/*/i, "/");
    }
  }

  // Recover the backend-relative path from stale bundle paths such as
  // file:///.../Bundle/Application/.../sites/ms/documents/medicos/....
  const publicFilePath = path.match(/(?:^|\/)(sites\/.*)$/i)?.[1];
  if (publicFilePath) {
    path = publicFilePath;
  } else if (/^file:|^\/(?:private|var|data)\//i.test(trimmed)) {
    // Never pass an unresolvable device/bundle path to React Native Image.
    return "";
  }

  if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?(?:\/|$)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const baseUrl = ENV.PUBLIC_FILE_BASE_URL.replace(/\/+$/, "");
  path = path.replace(/^\/+/, "");
  const basePath = baseUrl
    .match(/^https?:\/\/[^/]+(\/.*)$/i)?.[1]
    ?.replace(/\/+$/, "");
  if (
    basePath &&
    (path === basePath.replace(/^\/+/, "") ||
      path.startsWith(`${basePath.replace(/^\/+/, "")}/`))
  ) {
    path = path.slice(basePath.replace(/^\/+/, "").length).replace(/^\/+/, "");
  }
  return baseUrl && path ? `${baseUrl}/${path}` : "";
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={17} color={colors.primaryDark} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  error,
  required,
  editable = true,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  required?: boolean;
  editable?: boolean;
} & Omit<
  React.ComponentProps<typeof TextInput>,
  "value" | "onChangeText" | "editable"
>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholderTextColor="#94a3b8"
        style={[
          styles.input,
          error ? styles.inputError : null,
          !editable ? styles.inputReadonly : null,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.validationText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  error,
  onSelect,
}: {
  label: string;
  value: string;
  options: Option[];
  placeholder: string;
  error?: string;
  onSelect: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        style={[styles.selectButton, error ? styles.inputError : null]}
        onPress={() => setExpanded((current) => !current)}
        disabled={!options.length}
      >
        <Text
          style={[styles.selectValue, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected?.label ??
            (options.length ? placeholder : "Catálogo no disponible")}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.optionsBox}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.optionsScroll}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                style={styles.optionRow}
                onPress={() => {
                  onSelect(option.value);
                  setExpanded(false);
                }}
              >
                <Text style={styles.optionText}>{option.label}</Text>
                {option.value === value ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.validationText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function MultiSelectField({
  label,
  value,
  options,
  emptyMessage,
  onToggle,
}: {
  label: string;
  value: string[];
  options: Option[];
  emptyMessage: string;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.multiSelectTitleRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.selectionCount}>
          {value.length} seleccionada{value.length === 1 ? "" : "s"}
        </Text>
      </View>
      {options.length ? (
        <ScrollView
          nestedScrollEnabled
          style={styles.multiSelectBox}
          keyboardShouldPersistTaps="handled"
        >
          {options.map((option) => {
            const selected = value.includes(option.value);
            return (
              <Pressable
                key={option.value}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                style={styles.multiSelectRow}
                onPress={() => onToggle(option.value)}
              >
                <View
                  style={[styles.checkbox, selected && styles.checkboxSelected]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.catalogEmpty}>{emptyMessage}</Text>
      )}
    </View>
  );
}

function ImageAttachment({
  label,
  value,
  asset,
  onChange,
}: {
  label: string;
  value: string;
  asset: UserAsset | null;
  onChange: (value: UserAsset | null) => void;
}) {
  const [pickerError, setPickerError] = useState("");
  const [imageStatus, setImageStatus] = useState<{
    uri: string;
    status: "loading" | "loaded" | "error";
  } | null>(null);
  const previewUri = asset?.uri ?? resolveAssetUri(value);
  const imageError =
    imageStatus?.uri === previewUri && imageStatus.status === "error";
  const imageLoading =
    Boolean(previewUri) &&
    (imageStatus?.uri !== previewUri || imageStatus.status === "loading");

  const chooseImage = async () => {
    try {
      setPickerError("");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const picked = result.assets[0];
      onChange({
        uri: picked.uri,
        name:
          picked.fileName ?? `${label.toLocaleLowerCase()}-${Date.now()}.jpg`,
        mimeType: picked.mimeType ?? "image/jpeg",
        file: picked.file ?? null,
      });
    } catch {
      setPickerError(
        `No se pudo seleccionar ${label.toLocaleLowerCase()}. Intenta nuevamente.`,
      );
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.attachmentCard}
        onPress={() => void chooseImage()}
      >
        {previewUri && !imageError ? (
          <Image
            source={{ uri: previewUri }}
            resizeMode="contain"
            style={styles.attachmentPreview}
            onLoad={() => setImageStatus({ uri: previewUri, status: "loaded" })}
            onError={() => {
              setImageStatus({ uri: previewUri, status: "error" });
            }}
          />
        ) : (
          <View style={styles.attachmentPlaceholder}>
            <Ionicons
              name={
                imageError
                  ? "image-outline"
                  : label === "Foto"
                    ? "person-circle-outline"
                    : "create-outline"
              }
              size={32}
              color={imageError ? colors.error : "#7c9bb3"}
            />
            <Text style={styles.attachmentHint}>
              {imageError
                ? "No se pudo mostrar la imagen actual"
                : "Selecciona una imagen"}
            </Text>
            {imageError ? (
              <Text style={styles.imageErrorHint}>
                {
                  "Verifica que el archivo sea público y que el servidor de archivos esté disponible."
                }
              </Text>
            ) : null}
            {!previewUri && value ? (
              <Text style={styles.imageErrorHint}>
                No se pudo resolver la dirección del archivo. Revisa la base
                pública configurada.
              </Text>
            ) : null}
          </View>
        )}
        {imageLoading && !imageError ? (
          <View style={styles.imageLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Text style={styles.attachmentHint}>Cargando imagen…</Text>
          </View>
        ) : null}
        <View style={styles.attachmentFooter}>
          <Ionicons name="image-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.attachmentAction} numberOfLines={1}>
            {asset?.name ??
              (value
                ? "Imagen actual · Toca para reemplazar"
                : `Elegir ${label.toLocaleLowerCase()}`)}
          </Text>
        </View>
      </Pressable>
      {value && !asset ? (
        <Text style={styles.existingPath} numberOfLines={2}>
          Imagen actual guardada
        </Text>
      ) : null}
      {pickerError ? (
        <Text accessibilityRole="alert" style={styles.validationText}>
          {pickerError}
        </Text>
      ) : null}
    </View>
  );
}

export function UserFormModal({
  visible,
  mode,
  form,
  catalogs,
  errors,
  saving,
  formMessage,
  catalogMessage,
  catalogLoading,
  loadingDetail,
  detailError,
  onChange,
  onClose,
  onSubmit,
  onRetryDetail,
  onRetryCatalogs,
}: UserFormModalProps) {
  const isCreate = mode === "create";
  const communeOptions = catalogs.communes
    .filter((commune) => !form.state || String(commune.region) === form.state)
    .map((commune) => ({ value: String(commune.id), label: commune.nombre }));

  const setString = (field: UserFormField, value: string) =>
    onChange(field, value);
  const toggleValue = (field: "facility_id" | "especialidades", id: string) => {
    const current = form[field];
    onChange(
      field,
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.formModal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name={isCreate ? "person-add-outline" : "person-outline"}
                  size={20}
                  color={colors.primaryDark}
                />
              </View>
              <View style={styles.modalTitleContent}>
                <Text style={styles.modalTitle}>
                  {isCreate ? "Nuevo usuario" : "Editar usuario"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isCreate
                    ? "Completa los datos para crear la cuenta."
                    : `Actualiza los datos de ${form.username || "la cuenta"}.`}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar formulario"
              onPress={onClose}
              disabled={saving}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={23} color={colors.textSecondary} />
            </Pressable>
          </View>

          {formMessage ? (
            <View style={styles.formMessage}>
              <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
              <Text accessibilityRole="alert" style={styles.formMessageText}>
                {formMessage}
              </Text>
            </View>
          ) : null}

          {catalogMessage ? (
            <View style={styles.catalogMessage}>
              <Text style={styles.catalogMessageText}>{catalogMessage}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetryCatalogs}
                disabled={catalogLoading}
              >
                {catalogLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {loadingDetail ? (
            <View style={styles.detailLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.detailLoadingText}>
                Cargando detalle del usuario…
              </Text>
            </View>
          ) : detailError ? (
            <View style={styles.detailError}>
              <Ionicons
                name="alert-circle-outline"
                size={24}
                color={colors.error}
              />
              <Text style={styles.detailErrorText}>{detailError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetryDetail}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Reintentar detalle</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <FormSection title="Acceso a la cuenta" icon="key-outline">
                <Field
                  label="Nombre de usuario"
                  value={form.username}
                  onChangeText={(value) => setString("username", value)}
                  error={errors.username}
                  required
                  editable={isCreate}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Nombre de usuario"
                />
                <SelectField
                  label="Grupo de usuario"
                  value={form.user_group}
                  options={catalogs.groups.map((group) => ({
                    value: group.id,
                    label: group.label,
                  }))}
                  placeholder="Selecciona un grupo"
                  error={errors.user_group}
                  onSelect={(value) => setString("user_group", value)}
                />
                <Field
                  label={
                    isCreate ? "Contraseña" : "Nueva contraseña (opcional)"
                  }
                  value={form.stiltskin}
                  onChangeText={(value) => setString("stiltskin", value)}
                  error={errors.stiltskin}
                  required={isCreate}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={
                    isCreate
                      ? "Mínimo 8 caracteres"
                      : "Dejar en blanco para mantenerla"
                  }
                />
                <Field
                  label={
                    isCreate
                      ? "Repetir contraseña"
                      : "Confirmar nueva contraseña"
                  }
                  value={form.repeatPassword}
                  onChangeText={(value) => setString("repeatPassword", value)}
                  error={errors.repeatPassword}
                  required={isCreate}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Vuelve a escribir la contraseña"
                />
              </FormSection>

              <FormSection title="Datos personales" icon="id-card-outline">
                <Field
                  label="RUT"
                  value={form.federaltaxid}
                  onChangeText={(value) => setString("federaltaxid", value)}
                  error={errors.federaltaxid}
                  required
                  placeholder="12345678-9"
                  autoCapitalize="characters"
                />
                <Field
                  label="Nombres"
                  value={form.fname}
                  onChangeText={(value) => setString("fname", value)}
                  error={errors.fname}
                  required
                  placeholder="Nombres"
                  autoCapitalize="words"
                />
                <Field
                  label="Segundo nombre"
                  value={form.mname}
                  onChangeText={(value) => setString("mname", value)}
                  placeholder="Opcional"
                  autoCapitalize="words"
                />
                <Field
                  label="Apellidos"
                  value={form.lname}
                  onChangeText={(value) => setString("lname", value)}
                  error={errors.lname}
                  required
                  placeholder="Apellidos"
                  autoCapitalize="words"
                />
                <Field
                  label="Fecha de nacimiento"
                  value={form.birthday}
                  onChangeText={(value) => setString("birthday", value)}
                  error={errors.birthday}
                  required
                  placeholder="AAAA-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />
                <Field
                  label="Correo electrónico"
                  value={form.email}
                  onChangeText={(value) => setString("email", value)}
                  error={errors.email}
                  required
                  placeholder="nombre@ejemplo.cl"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Field
                  label="Especialización"
                  value={form.specialty}
                  onChangeText={(value) => setString("specialty", value)}
                  placeholder="Especialización"
                  autoCapitalize="sentences"
                />
              </FormSection>

              <FormSection title="Contacto y ubicación" icon="location-outline">
                <Field
                  label="Celular"
                  value={form.phonecell}
                  onChangeText={(value) => setString("phonecell", value)}
                  placeholder="Teléfono de contacto"
                  keyboardType="phone-pad"
                />
                <Field
                  label="Calle"
                  value={form.street}
                  onChangeText={(value) => setString("street", value)}
                  placeholder="Dirección"
                />
                <SelectField
                  label="Región"
                  value={form.state}
                  options={catalogs.regions.map((region) => ({
                    value: String(region.id_region),
                    label: region.region,
                  }))}
                  placeholder="Selecciona una región"
                  onSelect={(value) => {
                    setString("state", value);
                    setString("city", "");
                  }}
                />
                <SelectField
                  label="Comuna"
                  value={form.city}
                  options={communeOptions}
                  placeholder={
                    form.state
                      ? "Selecciona una comuna"
                      : "Primero selecciona una región"
                  }
                  onSelect={(value) => setString("city", value)}
                />
                <Field
                  label="ERX role"
                  value={form.erxrole}
                  onChangeText={(value) => setString("erxrole", value)}
                  placeholder="Opcional"
                  autoCapitalize="none"
                />
                <Field
                  label="Edad mínima de atención"
                  value={form.edad_i}
                  onChangeText={(value) => setString("edad_i", value)}
                  placeholder="Opcional"
                  keyboardType="numeric"
                />
              </FormSection>

              <FormSection title="Foto y firma" icon="images-outline">
                <ImageAttachment
                  label="Foto"
                  value={form.foto_url}
                  asset={form.foto}
                  onChange={(value) => {
                    onChange("foto", value);
                    if (value) onChange("foto_url", "");
                  }}
                />
                <Field
                  label="URL actual de foto"
                  value={form.foto_url}
                  onChangeText={(value) => setString("foto_url", value)}
                  placeholder="URL proporcionada por el sistema"
                  autoCapitalize="none"
                />
                <ImageAttachment
                  label="Firma"
                  value={form.firma_url}
                  asset={form.firma}
                  onChange={(value) => {
                    onChange("firma", value);
                    if (value) onChange("firma_url", "");
                  }}
                />
                <Field
                  label="URL actual de firma"
                  value={form.firma_url}
                  onChangeText={(value) => setString("firma_url", value)}
                  placeholder="URL proporcionada por el sistema"
                  autoCapitalize="none"
                />
              </FormSection>

              <FormSection
                title="Sucursales y especialidades"
                icon="business-outline"
              >
                <MultiSelectField
                  label="Sucursales"
                  value={form.facility_id}
                  options={catalogs.facilities.map((facility) => ({
                    value: String(facility.id),
                    label: facility.name,
                  }))}
                  emptyMessage="Sin sucursales disponibles."
                  onToggle={(value) => toggleValue("facility_id", value)}
                />
                <MultiSelectField
                  label="Especialidades"
                  value={form.especialidades}
                  options={catalogs.specialties.map((specialty) => ({
                    value: String(specialty.option_id),
                    label: specialty.title,
                  }))}
                  emptyMessage="Sin especialidades disponibles."
                  onToggle={(value) => toggleValue("especialidades", value)}
                />
                <View style={styles.authorizedRow}>
                  <View style={styles.authorizedCopy}>
                    <Text style={styles.fieldLabel}>Usuario autorizado</Text>
                    <Text style={styles.authorizedHint}>
                      Permite el estado autorizado registrado por el sistema.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Usuario autorizado"
                    value={form.authorized}
                    onValueChange={(value) => onChange("authorized", value)}
                    trackColor={{ false: "#cbd5e1", true: "#86efac" }}
                    thumbColor={form.authorized ? "#059669" : "#f8fafc"}
                  />
                </View>
                <Field
                  label="Información extra"
                  value={form.info}
                  onChangeText={(value) => setString("info", value)}
                  placeholder="Notas o información adicional"
                  multiline
                  textAlignVertical="top"
                  style={styles.infoInput}
                />
              </FormSection>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.submitButton,
                (pressed || saving || loadingDetail || !!detailError) &&
                  styles.submitPressed,
              ]}
              onPress={onSubmit}
              disabled={saving || loadingDetail || !!detailError}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#fff"
                />
              )}
              <Text style={styles.submitText}>
                {saving
                  ? "Guardando…"
                  : isCreate
                    ? "Crear usuario"
                    : "Guardar cambios"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  formModal: {
    height: "96%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf5fc",
    marginRight: 11,
  },
  modalTitleContent: { flex: 1 },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  modalSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  formScroll: { flex: 1 },
  formMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#fef2f2",
  },
  catalogMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: 14,
    marginTop: 10,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#fffbeb",
  },
  catalogMessageText: {
    flex: 1,
    color: "#92400e",
    fontSize: 12,
    lineHeight: 17,
  },
  formMessageText: { flex: 1, color: "#b91c1c", fontSize: 12, lineHeight: 17 },
  formContent: { padding: 14, paddingBottom: 28, gap: 12 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: colors.card,
    padding: 15,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  sectionIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#eaf5fc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  sectionBody: { gap: 13 },
  field: { gap: 6 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "700" },
  required: { color: colors.error },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: colors.error },
  inputReadonly: { backgroundColor: "#f1f5f9", color: colors.textSecondary },
  validationText: { color: "#b91c1c", fontSize: 12, lineHeight: 17 },
  selectButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  selectValue: { flex: 1, color: colors.text, fontSize: 14 },
  placeholder: { color: "#94a3b8" },
  optionsBox: {
    maxHeight: 185,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 11,
    overflow: "hidden",
  },
  optionsScroll: { flexGrow: 0 },
  optionRow: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    marginRight: 9,
  },
  multiSelectTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  selectionCount: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  multiSelectBox: {
    maxHeight: 170,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 11,
    paddingHorizontal: 10,
  },
  multiSelectRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef2f7",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.primaryDark,
  },
  catalogEmpty: {
    padding: 12,
    color: colors.textSecondary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 11,
    backgroundColor: "#f8fafc",
  },
  attachmentCard: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dbe4ec",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  attachmentPreview: { width: "100%", height: 150, backgroundColor: "#f1f5f9" },
  attachmentPlaceholder: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f1f7fb",
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(241, 245, 249, 0.88)",
  },
  attachmentHint: { color: colors.textSecondary, fontSize: 12 },
  imageErrorHint: {
    maxWidth: "90%",
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
  attachmentFooter: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  attachmentAction: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  existingPath: { color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
  authorizedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  authorizedCopy: { flex: 1 },
  authorizedHint: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  infoInput: { minHeight: 86 },
  detailLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  detailLoadingText: { color: colors.textSecondary, fontSize: 13 },
  detailError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  detailErrorText: {
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#eaf5fc",
  },
  retryButtonText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#f1f5f9",
  },
  cancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
  submitButton: {
    flex: 1.4,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
  },
  submitPressed: { opacity: 0.58 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
