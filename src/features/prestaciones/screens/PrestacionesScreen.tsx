import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ModuleBanner } from '@/components/ui/ModuleBanner';
import { Pagination } from '@/components/ui/PaginatedList';
import { getFriendlyErrorMessage } from '@/utils/apiError';
import { PAGE_SIZE } from '@/constants/theme';
import {
  minutesToSeconds,
  normalizeImEspecialidad,
  type PrestacionUpdatePayload,
  prestacionesService,
  secondsToMinutes,
  type ModalidadOption,
  type Prestacion,
  type PrestacionCreatePayload,
  type PrestacionForm,
  type Specialty,
} from '../services/prestacionesService';
import { useAppTheme } from '@/hooks/use-app-theme';

const emptyForm = (): PrestacionForm => ({
  pc_catname: '',
  pc_namemaipo: '',
  pc_codmaipo: '',
  pc_focod: '',
  pc_duration: '',
  pc_especialidad: 0,
  im_especialidad: '',
  pc_price: '',
  pc_active: 1,
  pc_externo: 0,
  pc_visible_agenda: 1,
  pc_catcolor: '#000000',
  pc_catdesc: '',
  pc_preparacion: '',
  pc_foprice: '',
  pc_foprice1_cp: '',
  pc_foprice2: '',
  pc_foprice2_cp: '',
  pc_foprice3: '',
  pc_foprice3_cp: '',
  pc_particular: 1,
  pc_aut_fonasa: 0,
  pc_asoc_plan: 0,
  tipo_presentacion: 0,
  pc_end_date_flag: 0,
  modalidad: 0,
  orden_medica: 0,
});

const imEspecialidadOptions = [
  { value: '', label: 'Sin especialidad IMD' },
  { value: '01000', label: 'Alergia infantil' },
  { value: '02680', label: 'Medicina Familiar' },
  { value: '02690', label: 'Medicina General' },
];

const presentationOptions = [
  { value: 0, label: 'Seleccione una opción' },
  { value: 2, label: 'Telemedicina' },
  { value: 3, label: 'Presencial' },
  { value: 4, label: 'Mixto' },
];
const presentationLabelByValue = new Map(
  presentationOptions.map((option) => [option.value, option.label]),
);

const yesNoOptions = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Sí' },
];

const yesNoFields = [
  ['PRESTACIÓN EXTERNA', 'pc_externo'],
  ['ACTIVA', 'pc_active'],
  ['VISIBLE EN AGENDA', 'pc_visible_agenda'],
  ['SOLO PARTICULAR', 'pc_particular'],
  ['AUTORIZADO FONASA', 'pc_aut_fonasa'],
  ['ASOCIADA A PLANES', 'pc_asoc_plan'],
  ['FECHA ENTREGA', 'pc_end_date_flag'],
  ['ORDEN MÉDICA', 'orden_medica'],
] as const;

const colorPresets = ['#000000', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumericInput(primary: unknown, fallback: unknown): number | '' {
  const value = primary ?? fallback;
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return asNumber(value);
}

function normalizeTipoPresentacion(value: unknown): number {
  const parsed = Number(value ?? 0);
  return parsed === 2 || parsed === 3 || parsed === 4 ? parsed : 0;
}

function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function buildPayload(form: PrestacionForm): PrestacionCreatePayload {
  const tipoPresentacion = Number(form.tipo_presentacion ?? 0);
  return {
    pc_catname: readString(form.pc_catname),
    pc_namemaipo: readString(form.pc_namemaipo),
    pc_codmaipo: readString(form.pc_codmaipo),
    pc_focod: readString(form.pc_focod),
    pc_duration: minutesToSeconds(Number(form.pc_duration) || 0),
    pc_especialidad: Number(form.pc_especialidad ?? 0),
    im_especialidad: normalizeImEspecialidad(form.im_especialidad ?? ''),
    pc_price: Math.trunc(Number(form.pc_price) || 0),
    pc_active: Number(form.pc_active ?? 1),
    pc_externo: Number(form.pc_externo ?? 0),
    pc_visible_agenda: Number(form.pc_visible_agenda ?? 1),
    pc_catcolor: readString(form.pc_catcolor) || '#000000',
    pc_catdesc: readString(form.pc_catdesc),
    pc_preparacion: readString(form.pc_preparacion),
    pc_foprice: Math.trunc(Number(form.pc_foprice) || 0),
    pc_foprice1_cp: Math.trunc(Number(form.pc_foprice1_cp) || 0),
    pc_foprice2: Math.trunc(Number(form.pc_foprice2 ?? 0) || 0),
    pc_foprice2_cp: Math.trunc(Number(form.pc_foprice2_cp ?? 0) || 0),
    pc_foprice3: Math.trunc(Number(form.pc_foprice3 ?? 0) || 0),
    pc_foprice3_cp: Math.trunc(Number(form.pc_foprice3_cp ?? 0) || 0),
    pc_particular: Number(form.pc_particular ?? 0),
    pc_aut_fonasa: Number(form.pc_aut_fonasa ?? 0),
    pc_asoc_plan: Number(form.pc_asoc_plan ?? 0),
    tipo_presentacion: normalizeTipoPresentacion(tipoPresentacion),
    pc_end_date_flag: Number(form.pc_end_date_flag ?? 0),
    modalidad: Number(form.modalidad ?? 0),
    orden_medica: Number(form.orden_medica ?? 0),
  };
}

function buildUpdatePayload(form: PrestacionForm): PrestacionUpdatePayload {
  const tipoPresentacion = normalizeTipoPresentacion(form.tipo_presentacion);
  return {
    pc_codmaipo: readString(form.pc_codmaipo),
    pc_focod: readString(form.pc_focod),
    pc_catname: readString(form.pc_catname),
    pc_namemaipo: readString(form.pc_namemaipo),
    pc_especialidad: Number(form.pc_especialidad ?? 0),
    im_especialidad: normalizeImEspecialidad(form.im_especialidad ?? ''),
    pc_duration: minutesToSeconds(Number(form.pc_duration) || 0),
    pc_price: Math.trunc(Number(form.pc_price) || 0),
    pc_foprice: Math.trunc(Number(form.pc_foprice) || 0),
    pc_foprice1_cp: Math.trunc(Number(form.pc_foprice1_cp) || 0),
    pc_foprice2: Math.trunc(Number(form.pc_foprice2 ?? 0)),
    pc_foprice2_cp: Math.trunc(Number(form.pc_foprice2_cp ?? 0)),
    pc_foprice3: Math.trunc(Number(form.pc_foprice3 ?? 0)),
    pc_foprice3_cp: Math.trunc(Number(form.pc_foprice3_cp ?? 0)),
    pc_particular: Number(form.pc_particular ?? 0),
    pc_aut_fonasa: Number(form.pc_aut_fonasa ?? 0),
    pc_externo: Number(form.pc_externo ?? 0),
    pc_visible_agenda: Number(form.pc_visible_agenda ?? 0),
    pc_asoc_plan: Number(form.pc_asoc_plan ?? 0),
    pc_end_date_flag: Number(form.pc_end_date_flag ?? 0),
    modalidad: Number(form.modalidad ?? 0),
    orden_medica: Number(form.orden_medica ?? 0),
    pc_catcolor: readString(form.pc_catcolor) || '#0ea5e9',
    pc_catdesc: readString(form.pc_catdesc),
    pc_preparacion: readString(form.pc_preparacion),
    pc_active: Number(form.pc_active ?? 0),
    ...(tipoPresentacion > 0 ? { tipo_presentacion: tipoPresentacion } : {}),
  };
}

function requestErrorMessage(error: unknown, fallback: string): string {
  return getFriendlyErrorMessage(error, fallback);
}

function mergeFormFromDetail(form: PrestacionForm, detail: Record<string, unknown>): PrestacionForm {
  const merged: PrestacionForm = {
    ...emptyForm(),
    ...form,
    ...detail,
  };

  merged.pc_catname = readString(detail.pc_catname ?? form.pc_catname);
  merged.pc_namemaipo = readString(detail.pc_namemaipo ?? form.pc_namemaipo);
  merged.pc_codmaipo = readString(detail.pc_codmaipo ?? form.pc_codmaipo);
  merged.pc_focod = readString(detail.pc_focod ?? form.pc_focod);
  merged.pc_especialidad = asNumber(detail.pc_especialidad ?? form.pc_especialidad ?? 0);
  merged.im_especialidad = normalizeImEspecialidad(
    detail.im_especialidad ?? detail.imEspecialidad ?? detail.IM_ESPECIALIDAD ?? form.im_especialidad ?? '',
  );
  const rawDuration = optionalNumericInput(detail.pc_duration, form.pc_duration);
  merged.pc_duration = rawDuration === '' ? '' : secondsToMinutes(rawDuration);
  merged.pc_price = optionalNumericInput(detail.pc_price, form.pc_price);
  merged.pc_foprice = optionalNumericInput(detail.pc_foprice, form.pc_foprice);
  merged.pc_foprice1_cp = optionalNumericInput(detail.pc_foprice1_cp, form.pc_foprice1_cp);
  merged.pc_foprice2 = optionalNumericInput(detail.pc_foprice2, form.pc_foprice2);
  merged.pc_foprice2_cp = optionalNumericInput(detail.pc_foprice2_cp, form.pc_foprice2_cp);
  merged.pc_foprice3 = optionalNumericInput(detail.pc_foprice3, form.pc_foprice3);
  merged.pc_foprice3_cp = optionalNumericInput(detail.pc_foprice3_cp, form.pc_foprice3_cp);
  merged.pc_externo = asNumber(detail.pc_externo ?? form.pc_externo ?? 0);
  merged.pc_active = asNumber(detail.pc_active ?? form.pc_active ?? 1);
  merged.pc_visible_agenda = asNumber(detail.pc_visible_agenda ?? form.pc_visible_agenda ?? 1);
  merged.pc_particular = asNumber(detail.pc_particular ?? form.pc_particular ?? 0);
  merged.pc_aut_fonasa = asNumber(detail.pc_aut_fonasa ?? form.pc_aut_fonasa ?? 0);
  merged.pc_asoc_plan = asNumber(detail.pc_asoc_plan ?? form.pc_asoc_plan ?? 0);
  merged.modalidad = Number(detail.modalidad ?? form.modalidad ?? 0);
  merged.orden_medica = asNumber(detail.orden_medica ?? form.orden_medica ?? 0);
  merged.pc_catcolor = readString(detail.pc_catcolor ?? form.pc_catcolor) || '#0ea5e9';
  merged.pc_catdesc = readString(detail.pc_catdesc ?? form.pc_catdesc);
  merged.pc_preparacion = readString(detail.pc_preparacion ?? form.pc_preparacion);
  merged.tipo_presentacion = asNumber(detail.tipo_presentacion ?? form.tipo_presentacion ?? 0);
  merged.pc_end_date_flag = asNumber(detail.pc_end_date_flag ?? form.pc_end_date_flag ?? 0);

  return merged;
}

function SearchableSelect({
  label,
  value,
  options,
  onSelect,
  placeholder,
  loading = false,
}: {
  label: string;
  value: number | string;
  options: { value: number | string; label: string }[];
  onSelect: (nextValue: number | string) => void;
  placeholder: string;
  loading?: boolean;
}) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value);
  const filtered = query.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        style={[styles.selectTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={[styles.selectValue, { color: selected ? colors.text : colors.textSecondary }]}>
          {loading ? 'Cargando opciones…' : selected?.label ?? placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={[styles.selectMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Buscar ${label.toLowerCase()}`}
            placeholderTextColor={colors.textSecondary}
            style={[styles.selectInput, { borderColor: colors.border, color: colors.text }]}
          />
          <ScrollView style={styles.selectList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.length ? (
              filtered.map((option) => (
                <Pressable
                  key={String(option.value)}
                  style={[styles.selectOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={[styles.selectOptionText, { color: colors.text }]}>{option.label}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin coincidencias.</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function OptionSegment({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onSelect: (value: number) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={styles.optionSegment}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onSelect(option.value)}
              style={[
                styles.optionSegmentItem,
                {
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionSegmentText,
                  { color: selected ? colors.primary : colors.textSecondary },
                ]}
              >
                {selected ? '✓ ' : ''}{option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BinarySegment({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: number;
  onSelect: (value: 0 | 1) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.binaryField}>
      <Text style={[styles.fieldLabel, styles.binaryLabel, { color: colors.text }]}>{label}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.binarySegment, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        {yesNoOptions.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${option.label}`}
              onPress={() => onSelect(option.value as 0 | 1)}
              style={[
                styles.binaryOption,
                selected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.binaryOptionText, { color: selected ? colors.surface : colors.textSecondary }]}>
                {selected ? '✓ ' : ''}{option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value || '—'}</Text>
    </View>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  numeric = false,
  multiline = false,
  required = false,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(nextValue) =>
          onChangeText(numeric ? nextValue.replace(/\D/g, '') : nextValue)
        }
        keyboardType={numeric ? 'number-pad' : 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          multiline && styles.textArea,
          { borderColor: error ? colors.error : colors.border, backgroundColor: colors.surface, color: colors.text },
        ]}
      />
      {error ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

export function PrestacionesScreen() {
  const { colors } = useAppTheme();
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [modalidades, setModalidades] = useState<ModalidadOption[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState('');
  const [specialtyError, setSpecialtyError] = useState('');
  const [modalityError, setModalityError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingPrestacion, setEditingPrestacion] = useState<Prestacion | null>(null);
  const [form, setForm] = useState<PrestacionForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'pc_catname' | 'pc_namemaipo' | 'pc_codmaipo' | 'pc_focod', string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const saveInProgress = useRef(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const statusMutationInProgress = useRef(false);
  const [statusTarget, setStatusTarget] = useState<Prestacion | null>(null);
  const [statusError, setStatusError] = useState('');
  const [selectedPrestacion, setSelectedPrestacion] = useState<Prestacion | null>(null);
  const [prestacionDetail, setPrestacionDetail] = useState<Record<string, unknown>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequestId = useRef(0);

  const loadData = useCallback(async () => {
    setLoadError('');
    setSpecialtyError('');
    setModalityError('');
    setPage(1);
    const [prestacionesResult, specialtiesResult, modalidadesResult] = await Promise.allSettled([
      prestacionesService.getPrestaciones(),
      prestacionesService.getSpecialties(),
      prestacionesService.getModalidades(),
    ]);

    if (prestacionesResult.status === 'fulfilled') {
      setPrestaciones((current) => {
        const serverIds = new Set(prestacionesResult.value.map((prestacion) => prestacion.id));
        const locallyInactive = current.filter(
          (prestacion) => prestacion.pc_active === 0 && !serverIds.has(prestacion.id),
        );
        return [...prestacionesResult.value, ...locallyInactive];
      });
    } else {
      setLoadError(requestErrorMessage(prestacionesResult.reason, 'No se pudieron cargar las prestaciones.'));
    }
    if (specialtiesResult.status === 'fulfilled') {
      setSpecialties(specialtiesResult.value);
    } else {
      setSpecialtyError(requestErrorMessage(specialtiesResult.reason, 'No se pudieron cargar las especialidades.'));
    }
    if (modalidadesResult.status === 'fulfilled') {
      setModalidades(modalidadesResult.value);
    } else {
      setModalityError(requestErrorMessage(modalidadesResult.reason, 'No se pudieron cargar las modalidades.'));
    }

  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setIsLoading(true);
      await loadData();
      if (active) {
        setIsLoading(false);
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [loadData]);

  const filteredPrestaciones = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const nextRows = prestaciones.filter((prestacion) => {
      if (!normalized) {
        return true;
      }
      return Object.values(prestacion).some((value) =>
        String(value).toLowerCase().includes(normalized),
      );
    });

    return nextRows;
  }, [prestaciones, search]);

  const currentPage = Math.min(Math.max(page, 1), Math.max(1, Math.ceil(filteredPrestaciones.length / PAGE_SIZE)));
  const visiblePrestaciones = filteredPrestaciones.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const openCreateForm = () => {
    setEditingPrestacion(null);
    setForm(emptyForm());
    setFormError('');
    setFieldErrors({});
    setFormVisible(true);
  };

  const openPrestacionDetail = async (prestacion: Prestacion) => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setSelectedPrestacion(prestacion);
    setPrestacionDetail({});
    setDetailError('');
    setDetailLoading(true);
    try {
      const detail = await prestacionesService.getPrestacionDetail(prestacion.id);
      if (detailRequestId.current === requestId) {
        setPrestacionDetail(detail);
      }
    } catch (error) {
      if (detailRequestId.current === requestId) {
        setDetailError(
          error instanceof Error && error.message
            ? error.message
            : 'No se pudo cargar el detalle de la prestación.',
        );
      }
    } finally {
      if (detailRequestId.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const closePrestacionDetail = () => {
    detailRequestId.current += 1;
    setSelectedPrestacion(null);
    setDetailLoading(false);
    setDetailError('');
  };

  const openEditForm = (
    prestacion: Prestacion,
    detail: Record<string, unknown> = prestacionDetail,
  ) => {
    setEditingPrestacion(prestacion);
    setFormError('');
    setFieldErrors({});
    setFormVisible(true);
    const baseForm: PrestacionForm = {
      ...emptyForm(),
      ...prestacion,
      pc_catid: prestacion.id,
    };
    setForm(mergeFormFromDetail(baseForm, detail));
  };

  const editPrestacionFromList = async (prestacion: Prestacion) => {
    try {
      setDetailLoading(true);
      const detail = await prestacionesService.getPrestacionDetail(prestacion.id);
      setPrestacionDetail(detail);
      setSelectedPrestacion(prestacion);
      openEditForm(prestacion, detail);
    } catch (error) {
      setDetailError(
        requestErrorMessage(error, 'No se pudo cargar el detalle de la prestación.'),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeForm = () => {
    if (!isSaving) {
      setFormVisible(false);
      setFormError('');
    }
  };

  const updateFormField = <K extends keyof PrestacionForm>(key: K, value: PrestacionForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'pc_catname' || key === 'pc_namemaipo' || key === 'pc_codmaipo' || key === 'pc_focod') {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
      setFormError('');
    }
  };

  const handleSave = async () => {
    if (saveInProgress.current) return;
    const clean = {
      pc_catname: readString(form.pc_catname),
      pc_namemaipo: readString(form.pc_namemaipo),
      pc_codmaipo: readString(form.pc_codmaipo),
      pc_focod: readString(form.pc_focod),
    };

    const errors = {
      pc_catname: clean.pc_catname ? undefined : 'El nombre interno es obligatorio.',
      pc_namemaipo: clean.pc_namemaipo ? undefined : 'El nombre Fonasa es obligatorio.',
      pc_codmaipo: clean.pc_codmaipo ? undefined : 'El código interno es obligatorio.',
      pc_focod: clean.pc_focod ? undefined : 'El código Fonasa es obligatorio.',
    };
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      setFormError('Completa nombre, nombre Fonasa, código interno y código Fonasa.');
      return;
    }

    try {
      saveInProgress.current = true;
      setIsSaving(true);
      setFormError('');
      setFieldErrors({});
      const payload = buildPayload(form);
      if (editingPrestacion) {
        await prestacionesService.updatePrestacion(editingPrestacion.id, buildUpdatePayload(form));
        setInfoMessage('Prestación actualizada exitosamente.');
        closePrestacionDetail();
      } else {
        await prestacionesService.createPrestacion(payload);
        setInfoMessage('Prestación creada exitosamente.');
        setPage(1);
        setForm(emptyForm());
      }
      setFormVisible(false);
      await loadData();
    } catch (error) {
      setFormError(requestErrorMessage(error, 'No se pudo guardar la prestación.'));
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (prestacion: Prestacion) => {
    if (statusMutationInProgress.current) return;
    setStatusError('');
    setStatusTarget(prestacion);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget || statusMutationInProgress.current) return;
    const prestacion = statusTarget;
    const targetStatus: 0 | 1 = prestacion.activa === 'Si' ? 0 : 1;

    statusMutationInProgress.current = true;
    setStatusUpdatingId(prestacion.id);
    setStatusError('');
    try {
      await prestacionesService.toggleStatus(prestacion.id, targetStatus);
      setInfoMessage('Estado actualizado correctamente.');
      setPrestaciones((current) =>
        current.map((entry) =>
          entry.id === prestacion.id
            ? {
                ...entry,
                pc_active: targetStatus,
                activa: targetStatus === 1 ? 'Si' : 'No',
              }
            : entry,
        ),
      );
      setSelectedPrestacion((current) =>
        current?.id === prestacion.id
          ? {
              ...current,
              pc_active: targetStatus,
              activa: targetStatus === 1 ? 'Si' : 'No',
            }
          : current,
      );
      setPrestacionDetail((current) => ({ ...current, pc_active: targetStatus }));
      setStatusTarget(null);
    } catch (error) {
      setStatusError(
        requestErrorMessage(error, 'No se pudo cambiar el estado de la prestación.'),
      );
    } finally {
      statusMutationInProgress.current = false;
      setStatusUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando prestaciones…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ModuleBanner
        title="Prestaciones"
        subtitle="Mantenimiento del catálogo de prestaciones clínicas y tarifarias."
        icon="medical-outline"
      />

      {loadError ? (
        <View style={[styles.alert, { backgroundColor: colors.errorBackground, borderColor: colors.border }]}> 
          <Text style={[styles.alertText, { color: colors.error }]}>{loadError}</Text>
          <Pressable onPress={() => void loadData()}>
            <Text style={[styles.retryText, { color: colors.primary }]}>{'Reintentar'}</Text>
          </Pressable>
        </View>
      ) : null}

      {infoMessage ? (
        <View style={[styles.infoBanner, { backgroundColor: colors.successBackground, borderColor: colors.successBorder }]}> 
          <Text style={[styles.infoBannerText, { color: colors.success }]}>{infoMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {selectedPrestacion ? (
          <View style={styles.detailContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver a la lista de prestaciones"
              style={styles.backButton}
              onPress={closePrestacionDetail}
            >
              <Ionicons name="arrow-back" size={19} color={colors.primary} />
              <Text style={[styles.backButtonText, { color: colors.primary }]}>Volver al listado</Text>
            </Pressable>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={styles.cardTitleGroup}>
                  <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedPrestacion.nombre}</Text>
                  <Text style={[styles.cardSubTitle, { color: colors.textSecondary }]}>
                    {selectedPrestacion.codigoInterno || '—'} · {selectedPrestacion.codigoFonasa || '—'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.stateBadge,
                    { backgroundColor: selectedPrestacion.activa === 'Si' ? colors.successBackground : colors.background },
                  ]}
                >
                  <Text style={{ color: selectedPrestacion.activa === 'Si' ? colors.success : colors.textSecondary }}>
                    {selectedPrestacion.activa}
                  </Text>
                </View>
              </View>

              {detailLoading ? (
                <View style={styles.detailLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>Cargando detalle…</Text>
                </View>
              ) : null}
              {detailError ? (
                <View style={[styles.alert, { backgroundColor: colors.errorBackground, borderColor: colors.border }]}>
                  <Text style={[styles.alertText, { color: colors.error }]}>{detailError}</Text>
                  <Pressable onPress={() => void openPrestacionDetail(selectedPrestacion)}>
                    <Text style={[styles.retryText, { color: colors.primary }]}>Reintentar</Text>
                  </Pressable>
                </View>
              ) : null}

              {(() => {
                const detail: Record<string, unknown> = {
                  ...selectedPrestacion,
                  ...prestacionDetail,
                };
                const specialtyId = String(detail.pc_especialidad ?? '');
                const specialtyName =
                  specialties.find((specialty) => specialty.option_id === specialtyId)?.title ??
                  selectedPrestacion.especialidad;
                const modalityId = Number(detail.modalidad ?? 0);
                const modalityName =
                  modalidades.find((option) => option.id === modalityId)?.name_modality ??
                  selectedPrestacion.modalidadLabel ??
                  '';
                const durationValue = asNumber(detail.pc_duration ?? selectedPrestacion.pc_duration);
                const duration = secondsToMinutes(durationValue);
                const yesNo = (value: unknown) => (asNumber(value) === 1 ? 'Sí' : 'No');
                const money = (value: unknown) =>
                  `$${asNumber(value).toLocaleString('es-CL')}`;

                return (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Datos básicos</Text>
                    <DetailRow label="Nombre interno" value={String(detail.pc_catname ?? '')} />
                    <DetailRow label="Nombre Fonasa" value={String(detail.pc_namemaipo ?? '')} />
                    <DetailRow label="Código interno" value={String(detail.pc_codmaipo ?? '')} />
                    <DetailRow label="Código Fonasa" value={String(detail.pc_focod ?? '')} />

                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Especialidad y tarifación</Text>
                    <DetailRow label="Especialidad" value={specialtyName} />
                    <DetailRow label="IM especialidad" value={normalizeImEspecialidad(detail.im_especialidad ?? detail.imEspecialidad ?? detail.IM_ESPECIALIDAD)} />
                    <DetailRow label="Duración" value={`${duration} min`} />
                    <DetailRow label="Precio particular" value={money(detail.pc_price)} />
                    <DetailRow label="Total FN1" value={money(detail.pc_foprice)} />
                    <DetailRow label="Copago FN1" value={money(detail.pc_foprice1_cp)} />
                    <DetailRow label="Total FN2" value={money(detail.pc_foprice2)} />
                    <DetailRow label="Copago FN2" value={money(detail.pc_foprice2_cp)} />
                    <DetailRow label="Total FN3" value={money(detail.pc_foprice3)} />
                    <DetailRow label="Copago FN3" value={money(detail.pc_foprice3_cp)} />

                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Estado y agenda</Text>
                    <DetailRow label="Prestación externa" value={yesNo(detail.pc_externo)} />
                    <DetailRow label="Activa" value={yesNo(detail.pc_active)} />
                    <DetailRow label="Visible en agenda" value={yesNo(detail.pc_visible_agenda)} />
                    <DetailRow label="Solo particular" value={yesNo(detail.pc_particular)} />
                    <DetailRow label="Autorizado Fonasa" value={yesNo(detail.pc_aut_fonasa)} />
                    <DetailRow label="Asociada a planes" value={yesNo(detail.pc_asoc_plan)} />
                    <DetailRow
                      label="Tipo de presentación"
                      value={presentationLabelByValue.get(normalizeTipoPresentacion(detail.tipo_presentacion)) ?? 'Seleccione una opción'}
                    />
                    <DetailRow label="Fecha entrega" value={yesNo(detail.pc_end_date_flag)} />
                    <DetailRow label="Modalidad" value={modalityName} />
                    <DetailRow label="Orden médica" value={String(detail.orden_medica ?? '0')} />
                    <DetailRow label="Color" value={String(detail.pc_catcolor ?? '')} />

                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Descripción y preparación</Text>
                    <DetailRow label="Descripción" value={String(detail.pc_catdesc ?? '')} />
                    <DetailRow label="Preparación" value={String(detail.pc_preparacion ?? '')} />
                  </>
                );
              })()}

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={() => void openEditForm(selectedPrestacion)}
                  disabled={detailLoading || Boolean(detailError) || statusUpdatingId === selectedPrestacion.id}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    {detailLoading ? 'Cargando…' : 'Editar'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={() => handleToggleStatus(selectedPrestacion)}
                  disabled={statusUpdatingId === selectedPrestacion.id}
                >
                  {statusUpdatingId === selectedPrestacion.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons
                      name={selectedPrestacion.activa === 'Si' ? 'toggle' : 'toggle-outline'}
                      size={16}
                      color={colors.primary}
                    />
                  )}
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                    {statusUpdatingId === selectedPrestacion.id
                      ? 'Actualizando…'
                      : selectedPrestacion.activa === 'Si' ? 'Desactivar' : 'Activar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.toolbar}>
              <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder="Buscar prestaciones"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.searchInput, { color: colors.text }]}
                  autoCorrect={false}
                  accessibilityLabel="Buscar prestaciones por nombre, códigos o especialidad"
                />
                {search ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar búsqueda"
                    onPress={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    hitSlop={8}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
              </View>

              <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={openCreateForm}>
                <Ionicons name="add-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Agregar</Text>
              </Pressable>
            </View>

            <View style={styles.listHeader}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {`${filteredPrestaciones.length} ${filteredPrestaciones.length === 1 ? 'prestación' : 'prestaciones'}`}
              </Text>
            </View>

            {visiblePrestaciones.length === 0 && loadError ? null : visiblePrestaciones.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin resultados</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No hay prestaciones que coincidan con la búsqueda.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {visiblePrestaciones.map((prestacion) => (
                  <View
                    key={prestacion.id}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Ver detalle de ${prestacion.nombre}`}
                      accessibilityHint="Muestra todos los datos de la prestación."
                      onPress={() => void openPrestacionDetail(prestacion)}
                      style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleGroup}>
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                            {prestacion.nombre}
                          </Text>
                          <Text style={[styles.cardSubTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            ID {prestacion.id} · {prestacion.codigoInterno || '—'} · Fonasa {prestacion.codigoFonasa || '—'}
                          </Text>
                          <Text style={[styles.summarySpecialty, { color: colors.textSecondary }]} numberOfLines={1}>
                            {prestacion.especialidad || 'Sin especialidad'} · {prestacion.duracion} min · ${prestacion.precioParticular.toLocaleString('es-CL')}
                          </Text>
                          <Text style={[styles.summarySpecialty, { color: colors.textSecondary }]} numberOfLines={1}>
                            Copago FN1 ${prestacion.copagoFn1.toLocaleString('es-CL')} · Total FN1 ${prestacion.totalFn1.toLocaleString('es-CL')} · Externa {prestacion.externa === 'Si' ? 'Sí' : 'No'} · Agenda {prestacion.visibleAgenda === 'Si' ? 'Sí' : 'No'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.stateBadge,
                            { backgroundColor: prestacion.activa === 'Si' ? colors.successBackground : colors.background },
                          ]}
                        >
                          <Text style={{ color: prestacion.activa === 'Si' ? colors.success : colors.textSecondary }}>
                            {prestacion.activa === 'Si' ? 'Activa' : 'Inactiva'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </View>
                    </Pressable>
                    <View style={styles.cardActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${prestacion.nombre}`}
                        style={[styles.cardActionButton, { borderColor: colors.border }]}
                        onPress={() => void editPrestacionFromList(prestacion)}
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                        <Text style={[styles.cardActionText, { color: colors.primary }]}>Editar</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${prestacion.activa === 'Si' ? 'Desactivar' : 'Activar'} ${prestacion.nombre}`}
                        style={[styles.cardActionButton, { borderColor: colors.border }]}
                        disabled={statusUpdatingId === prestacion.id}
                        onPress={() => handleToggleStatus(prestacion)}
                      >
                        {statusUpdatingId === prestacion.id ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons name="power-outline" size={16} color={colors.primary} />
                        )}
                        <Text style={[styles.cardActionText, { color: colors.primary }]}>
                          {prestacion.activa === 'Si' ? 'Desactivar' : 'Activar'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Pagination
              page={currentPage}
              totalItems={filteredPrestaciones.length}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </ScrollView>

      <Modal visible={formVisible} animationType="slide" transparent onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}> 
            <View style={styles.modalHeader}> 
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingPrestacion ? 'EDITAR PRESTACIÓN' : 'AGREGAR PRESTACIÓN'}
              </Text>
              <Pressable
                onPress={closeForm}
                accessibilityRole="button"
                accessibilityLabel="Cerrar formulario"
                hitSlop={10}
                disabled={isSaving}
              >
                <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.formSectionCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>1. Datos básicos</Text>
                <FormInput label="NOMBRE INTERNO" value={form.pc_catname} onChangeText={(value) => updateFormField('pc_catname', value)} required error={fieldErrors.pc_catname} />
                <FormInput label="NOMBRE FONASA" value={form.pc_namemaipo} onChangeText={(value) => updateFormField('pc_namemaipo', value)} required error={fieldErrors.pc_namemaipo} />
                <FormInput label="CÓDIGO INTERNO" value={form.pc_codmaipo} onChangeText={(value) => updateFormField('pc_codmaipo', value)} required error={fieldErrors.pc_codmaipo} />
                <FormInput label="CÓDIGO FONASA" value={form.pc_focod} onChangeText={(value) => updateFormField('pc_focod', value)} required error={fieldErrors.pc_focod} />
              </View>

              <View style={[styles.formSectionCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>2. Especialidad y tarifación</Text>
                {specialtyError ? (
                <View style={[styles.alert, { backgroundColor: colors.errorBackground, borderColor: colors.border }]}>
                  <Text style={[styles.alertText, { color: colors.error }]}>{specialtyError}</Text>
                  <Pressable onPress={() => void loadData()}><Text style={[styles.retryText, { color: colors.primary }]}>Reintentar</Text></Pressable>
                </View>
                ) : null}
              <SearchableSelect
                label="ESPECIALIDAD"
                value={String(form.pc_especialidad ?? 0)}
                options={[
                  { value: '0', label: 'Sin especialidad' },
                  ...specialties.map((specialty) => ({
                    value: String(specialty.option_id),
                    label: specialty.title,
                  })),
                ]}
                onSelect={(nextValue) => updateFormField('pc_especialidad', Number(nextValue))}
                placeholder="Selecciona especialidad"
                loading={isLoading}
              />
              <SearchableSelect
                label="IM ESPECIALIDAD"
                value={normalizeImEspecialidad(form.im_especialidad)}
                options={imEspecialidadOptions}
                onSelect={(value) => updateFormField('im_especialidad', normalizeImEspecialidad(value))}
                placeholder="Selecciona IM especialidad"
              />
              <FormInput label="DURACIÓN (MINUTOS)" numeric value={String(form.pc_duration ?? '')} onChangeText={(value) => updateFormField('pc_duration', value === '' ? '' : Number(value))} placeholder="Ej.: 30 minutos" />
              <FormInput label="PRECIO PARTICULAR (CLP)" numeric value={String(form.pc_price ?? '')} onChangeText={(value) => updateFormField('pc_price', value === '' ? '' : Number(value))} placeholder="$" />
              <View style={[styles.pricePair, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.pricePairTitle, { color: colors.text }]}>Fonasa 1</Text>
                <FormInput label="TOTAL FN1 ($)" numeric value={String(form.pc_foprice ?? '')} onChangeText={(value) => updateFormField('pc_foprice', value === '' ? '' : Number(value))} placeholder="0" />
                <FormInput label="COPAGO FN1 ($)" numeric value={String(form.pc_foprice1_cp ?? '')} onChangeText={(value) => updateFormField('pc_foprice1_cp', value === '' ? '' : Number(value))} placeholder="0" />
              </View>
              <View style={[styles.pricePair, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.pricePairTitle, { color: colors.text }]}>Fonasa 2</Text>
                <FormInput label="TOTAL FN2 ($)" numeric value={String(form.pc_foprice2 ?? '')} onChangeText={(value) => updateFormField('pc_foprice2', value === '' ? '' : Number(value))} placeholder="0" />
                <FormInput label="COPAGO FN2 ($)" numeric value={String(form.pc_foprice2_cp ?? '')} onChangeText={(value) => updateFormField('pc_foprice2_cp', value === '' ? '' : Number(value))} placeholder="0" />
              </View>
              <View style={[styles.pricePair, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.pricePairTitle, { color: colors.text }]}>Fonasa 3</Text>
                <FormInput label="TOTAL FN3 ($)" numeric value={String(form.pc_foprice3 ?? '')} onChangeText={(value) => updateFormField('pc_foprice3', value === '' ? '' : Number(value))} placeholder="0" />
                <FormInput label="COPAGO FN3 ($)" numeric value={String(form.pc_foprice3_cp ?? '')} onChangeText={(value) => updateFormField('pc_foprice3_cp', value === '' ? '' : Number(value))} placeholder="0" />
              </View>
              </View>

              <View style={[styles.formSectionCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>3. Estado y agenda</Text>
                {modalityError ? (
                <View style={[styles.alert, { backgroundColor: colors.errorBackground, borderColor: colors.border }]}>
                  <Text style={[styles.alertText, { color: colors.error }]}>{modalityError}</Text>
                  <Pressable onPress={() => void loadData()}><Text style={[styles.retryText, { color: colors.primary }]}>Reintentar</Text></Pressable>
                </View>
                ) : null}
              <SearchableSelect
                label="MODALIDAD"
                value={String(form.modalidad ?? 0)}
                options={[
                  { value: '0', label: 'Sin modalidad' },
                  ...modalidades.map((option) => ({
                    value: String(option.id),
                    label: `${option.name_modality}${option.acronimo ? ` (${option.acronimo})` : ''}`,
                  })),
                ]}
                onSelect={(nextValue) => updateFormField('modalidad', Number(nextValue))}
                placeholder="Selecciona modalidad"
                loading={isLoading}
              />
              <OptionSegment
                label="TIPO DE PRESENTACIÓN"
                value={normalizeTipoPresentacion(form.tipo_presentacion)}
                options={presentationOptions}
                onSelect={(value) => updateFormField('tipo_presentacion', normalizeTipoPresentacion(value))}
              />
              {yesNoFields.map(([label, key]) => (
                <BinarySegment
                  key={key}
                  label={label}
                  value={Number(form[key] ?? 0)}
                  onSelect={(value) => updateFormField(key, value)}
                />
              ))}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>COLOR DE LA PRESTACIÓN</Text>
                <View style={styles.colorField}>
                  <View style={[styles.colorSwatch, { backgroundColor: isHexColor(form.pc_catcolor ?? '') ? form.pc_catcolor : colors.surface, borderColor: colors.border }]} />
                  <TextInput
                    accessibilityLabel="Color de la prestación"
                    value={String(form.pc_catcolor ?? '#000000')}
                    onChangeText={(value) => updateFormField('pc_catcolor', value)}
                    placeholder="#000000"
                    autoCapitalize="none"
                    style={[styles.input, styles.colorInput, { borderColor: colors.border, color: colors.text }]}
                  />
                </View>
                <View style={styles.colorPresets}>
                  {colorPresets.map((color) => (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={`Usar color ${color}`}
                      accessibilityState={{ selected: form.pc_catcolor === color }}
                      onPress={() => updateFormField('pc_catcolor', color)}
                      style={[
                        styles.colorPreset,
                        { backgroundColor: color, borderColor: form.pc_catcolor === color ? colors.text : colors.border },
                      ]}
                    />
                  ))}
                </View>
              </View>
              </View>

              <View style={[styles.formSectionCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>4. Descripción y preparación</Text>
                <FormInput label="DESCRIPCIÓN" value={form.pc_catdesc ?? ''} onChangeText={(value) => updateFormField('pc_catdesc', value)} multiline placeholder="Describe la prestación" />
                <FormInput label="PREPARACIÓN" value={form.pc_preparacion ?? ''} onChangeText={(value) => updateFormField('pc_preparacion', value)} multiline placeholder="Indicaciones previas para el paciente" />
              </View>

              {formError ? (
                <Text style={[styles.formError, { color: colors.error }]}>{formError}</Text>
              ) : null}
            </ScrollView>
            <View style={[styles.modalActions, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <Pressable
                accessibilityRole="button"
                style={[styles.modalSecondary, { borderColor: colors.border }]}
                onPress={closeForm}
                disabled={isSaving}
              >
                <Text style={[styles.modalSecondaryText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.modalPrimary, { backgroundColor: colors.primary }, isSaving && styles.disabledButton]}
                onPress={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={colors.surface} /> : null}
                <Text style={styles.modalPrimaryText}>
                  {isSaving ? 'Guardando…' : editingPrestacion ? 'Guardar cambios' : 'Crear prestación'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={statusTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!statusUpdatingId) setStatusTarget(null);
        }}
      >
        {(() => {
          const isActive = statusTarget?.activa === 'Si';
          const actionLabel = isActive ? 'Desactivar' : 'Activar';
          return (
            <View style={styles.statusConfirmBackdrop}>
              <View style={[styles.statusConfirmCard, { backgroundColor: colors.surface }]}>
                <View
                  style={[
                    styles.statusConfirmIcon,
                    { backgroundColor: isActive ? colors.errorBackground : colors.successBackground },
                  ]}
                >
                  <Ionicons
                    name={isActive ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                    size={26}
                    color={isActive ? colors.error : colors.success}
                  />
                </View>
                <Text style={[styles.statusConfirmTitle, { color: colors.text }]}>
                  {actionLabel} prestación
                </Text>
                <Text style={[styles.statusConfirmText, { color: colors.textSecondary }]}>
                  ¿Deseas {actionLabel.toLocaleLowerCase()}{' '}
                  <Text style={[styles.statusConfirmName, { color: colors.text }]}>
                    {statusTarget?.nombre ?? ''}
                  </Text>
                  ?
                </Text>
                {statusError ? (
                  <Text accessibilityRole="alert" style={[styles.statusConfirmError, { color: colors.error }]}>
                    {statusError}
                  </Text>
                ) : null}
                <View style={styles.statusConfirmActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.statusCancelButton, { backgroundColor: colors.background }]}
                    onPress={() => setStatusTarget(null)}
                    disabled={statusUpdatingId !== null}
                  >
                    <Text style={[styles.statusCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.statusConfirmButton,
                      { backgroundColor: isActive ? colors.error : colors.success },
                    ]}
                    onPress={() => void confirmStatusChange()}
                    disabled={statusUpdatingId !== null}
                  >
                    {statusUpdatingId === statusTarget?.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.statusConfirmButtonText}>{actionLabel}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })()}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingBottom: 12 },
  listScroll: { flex: 1 },
  listScrollContent: { flexGrow: 1, paddingBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14 },
  alert: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertText: { fontSize: 13, flex: 1 },
  retryText: { fontWeight: '700' },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  infoBannerText: { fontSize: 13, fontWeight: '600' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 48,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  clearSearchButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    paddingVertical: 10,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  listHeader: { marginBottom: 10 },
  metaText: { fontSize: 12 },
  listContainer: { gap: 10, paddingBottom: 10 },
  detailContainer: { flex: 1, gap: 10 },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 4,
  },
  backButtonText: { fontSize: 14, fontWeight: '700' },
  detailCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  detailTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  detailLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  detailLabel: { flex: 1, fontSize: 13 },
  detailValue: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  colorField: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorSwatch: { width: 34, height: 34, borderRadius: 8, borderWidth: 1 },
  colorInput: { flex: 1, marginBottom: 0 },
  colorPresets: { flexDirection: 'row', gap: 10, marginTop: 10 },
  colorPreset: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  cardMain: { minHeight: 76, justifyContent: 'center' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#cbd5e1' },
  cardActionButton: { minHeight: 44, flex: 1, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  cardActionText: { fontSize: 13, fontWeight: '700' },
  cardPressed: { opacity: 0.78 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitleGroup: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubTitle: { marginTop: 4, fontSize: 12 },
  summarySpecialty: { marginTop: 5, fontSize: 12 },
  stateBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  metaCell: { width: '48%' },
  metaLabel: { fontSize: 11, textTransform: 'uppercase' },
  metaValue: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: { fontWeight: '700' },
  emptyState: { paddingVertical: 28, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 12, backgroundColor: 'rgba(15, 23, 42, 0.42)' },
  modalCard: { height: '96%', maxHeight: '96%', borderRadius: 20, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0, overflow: 'hidden' },
  modalHeader: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', flex: 1 },
  formScroll: { flex: 1 },
  formScrollContent: { paddingBottom: 24, gap: 12 },
  formSectionCard: { borderWidth: 1, borderRadius: 16, padding: 14 },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800', marginBottom: 12 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700', marginBottom: 6, letterSpacing: 0.25 },
  fieldError: { fontSize: 12, lineHeight: 17, marginTop: 4, fontWeight: '600' },
  binaryField: { marginBottom: 12 },
  binaryLabel: { marginBottom: 7 },
  binarySegment: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3, gap: 4 },
  binaryOption: { minHeight: 46, flex: 1, borderRadius: 9, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  binaryOptionText: { fontSize: 15, fontWeight: '700' },
  optionSegment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionSegmentItem: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  optionSegmentText: { fontSize: 13, fontWeight: '700' },
  pricePair: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  pricePairTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  selectTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectValue: { fontSize: 14, flex: 1 },
  selectMenu: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
    maxHeight: 240,
  },
  selectInput: {
    borderWidth: 1,
    borderRadius: 8,
    margin: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectList: { maxHeight: 200 },
  selectOption: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectOptionText: { fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 112,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 0,
  },
  formError: { marginTop: 4, marginBottom: 8, fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  modalSecondary: { minHeight: 48, flex: 0.8, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  modalSecondaryText: { fontSize: 14, fontWeight: '700' },
  modalPrimary: { minHeight: 48, flex: 1.2, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabledButton: { opacity: 0.65 },
  statusConfirmBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  statusConfirmCard: { padding: 22, borderRadius: 20 },
  statusConfirmIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, marginBottom: 13 },
  statusConfirmTitle: { fontSize: 19, fontWeight: '800' },
  statusConfirmText: { fontSize: 14, lineHeight: 21, marginTop: 9 },
  statusConfirmName: { fontWeight: '800' },
  statusConfirmError: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  statusConfirmActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  statusCancelButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  statusCancelText: { fontSize: 14, fontWeight: '700' },
  statusConfirmButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  statusConfirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default PrestacionesScreen;
