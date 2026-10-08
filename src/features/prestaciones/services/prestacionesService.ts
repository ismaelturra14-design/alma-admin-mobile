import api from '@/api/axiosClient';
import { ENV } from '@/config/env';

export type Specialty = {
  option_id: string;
  title: string;
};

export type ModalidadOption = {
  id: number;
  name_modality: string;
  acronimo?: string;
};

export type PrestacionForm = {
  pc_catid?: number;
  pc_codmaipo: string;
  pc_focod: string;
  pc_catname: string;
  pc_namemaipo: string;
  pc_duration: number | '';
  pc_price: number | '';
  pc_foprice1_cp: number | '';
  pc_foprice: number | '';
  pc_foprice2?: number | '';
  pc_foprice2_cp?: number | '';
  pc_foprice3?: number | '';
  pc_foprice3_cp?: number | '';
  pc_externo: number;
  pc_active: number;
  pc_visible_agenda: number;
  pc_especialidad?: number;
  im_especialidad?: string;
  pc_particular?: number;
  pc_aut_fonasa?: number;
  pc_asoc_plan?: number;
  tipo_presentacion?: number;
  pc_end_date_flag?: number;
  modalidad?: number | null;
  orden_medica?: number;
  pc_catcolor?: string;
  pc_catdesc?: string;
  pc_preparacion?: string;
  [key: string]: unknown;
};

export type PrestacionCreatePayload = {
  pc_catname: string;
  pc_namemaipo: string;
  pc_codmaipo: string;
  pc_focod: string;
  pc_duration: number;
  pc_especialidad: number;
  im_especialidad: string;
  pc_price: number;
  pc_active: number;
  pc_externo: number;
  pc_visible_agenda: number;
  pc_catcolor: string;
  pc_catdesc: string;
  pc_preparacion: string;
  pc_foprice: number;
  pc_foprice1_cp: number;
  pc_foprice2: number;
  pc_foprice2_cp: number;
  pc_foprice3: number;
  pc_foprice3_cp: number;
  pc_particular: number;
  pc_aut_fonasa: number;
  pc_asoc_plan: number;
  tipo_presentacion: number;
  pc_end_date_flag: number;
  modalidad: number | null;
  orden_medica: number;
};

export type PrestacionUpdatePayload = Omit<PrestacionCreatePayload, 'tipo_presentacion'> & {
  pc_codmaipo: string;
  pc_focod: string;
  pc_catname: string;
  pc_namemaipo: string;
  tipo_presentacion?: number;
};

export type Prestacion = {
  id: number;
  pc_catid?: number;
  pc_codmaipo: string;
  pc_focod: string;
  pc_catname: string;
  pc_namemaipo: string;
  pc_duration: number;
  pc_especialidad?: number;
  im_especialidad?: string;
  pc_foprice?: number;
  pc_foprice1_cp?: number;
  pc_foprice2?: number;
  pc_foprice2_cp?: number;
  pc_foprice3?: number;
  pc_foprice3_cp?: number;
  pc_price: number;
  pc_active: number;
  pc_externo: number;
  pc_visible_agenda: number;
  pc_particular?: number;
  pc_aut_fonasa?: number;
  pc_asoc_plan?: number;
  modalidad?: number | null;
  tipo_presentacion?: number;
  pc_end_date_flag?: number;
  orden_medica?: number;
  pc_catcolor?: string;
  pc_catdesc?: string;
  pc_preparacion?: string;
  especialidad: string;
  modalidadLabel?: string;
  duracion: number;
  precioParticular: number;
  activa: 'Si' | 'No';
  externa: 'Si' | 'No';
  visibleAgenda: 'Si' | 'No';
  copagoFn1: number;
  totalFn1: number;
  nombre: string;
  codigoInterno: string;
  codigoFonasa: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function throwIfApiError(payload: unknown): void {
  if (
    isRecord(payload) &&
    (payload.status === 'error' || payload.status === 'failed')
  ) {
    throw new Error(asText(payload.message) || 'No se pudo completar la solicitud.');
  }
}

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toDisplayMinutes(rawValue: unknown): number {
  const value = asNumber(rawValue, 0);
  return Math.max(0, Math.round((value / 60) * 10) / 10);
}

export function normalizeImEspecialidad(value: unknown): string {
  const normalized = asText(value).trim();
  if (normalized === '' || normalized === '0') {
    return '';
  }
  if (/^\d+$/.test(normalized)) {
    return normalized.padStart(5, '0');
  }
  return normalized;
}

export function minutesToSeconds(value: number): number {
  const numericValue = Number.isFinite(value) ? Number(value) : 0;
  return Math.max(0, Math.trunc(numericValue * 60));
}

export function secondsToMinutes(value: number): number {
  const numericValue = Number.isFinite(value) ? Number(value) : 0;
  return Math.max(0, Math.round((numericValue / 60) * 10) / 10);
}

function buildRows(data: unknown): unknown[] {
  throwIfApiError(data);
  if (Array.isArray(data)) {
    return data;
  }
  if (isRecord(data)) {
    const maybeData = firstValue(data, ['data', 'rows', 'items', 'categories', 'prestaciones'])
      ?? firstValue(data, ['result', 'payload']);
    if (Array.isArray(maybeData)) {
      return maybeData;
    }
    if (isRecord(maybeData)) {
      return buildRows(maybeData);
    }
  }
  throw new Error('La respuesta del servidor no contiene una lista válida.');
}

function parseEspecialidadLabel(row: Record<string, unknown>): string {
  const candidate = firstValue(row, [
    'especialidad',
    'specialty_name',
    'speciality_name',
    'especialidad_nombre',
    'nombre_especialidad',
    'specialtyName',
    'especialidadName',
  ]);
  const nested = row.specialty && isRecord(row.specialty)
    ? firstValue(row.specialty as Record<string, unknown>, ['title', 'name', 'nombre'])
    : undefined;
  const value = candidate ?? nested;
  return asText(value);
}

function parsePrestacionRow(row: unknown): Prestacion | null {
  if (!isRecord(row)) {
    return null;
  }

  const id = positiveInteger(
    firstValue(row, ['pc_catid', 'id', 'categorie_id', 'category_id', 'prestacion_id', 'prestacionId'])
      ?? firstValue(row, ['cat_id', 'categoria_id'])
  );
  if (!id) {
    return null;
  }

  const codigoInterno = asText(
    firstValue(row, ['pc_codmaipo', 'codigoInterno', 'codmaipo', 'codigo_interno'])
  );
  const codigoFonasa = asText(
    firstValue(row, ['pc_focod', 'codigoFonasa', 'focod', 'codigo_fonasa'])
  );
  const nombre = asText(
    firstValue(row, ['pc_catname', 'nombre', 'name', 'categorie_name', 'category_name', 'prestacion_name'])
  );
  const pc_namemaipo = asText(
    firstValue(row, ['pc_namemaipo', 'namemaipo', 'nombre_fonasa', 'nombreFonasa'])
  );
  const especialidad = parseEspecialidadLabel(row);
  const modalidadValue = asNumber(
    firstValue(row, ['modalidad', 'pc_modalidad', 'modality', 'id_modalidad', 'modality_id'])
  );
  const rawDuration = asNumber(firstValue(row, ['pc_duration', 'duration', 'duracion']));
  const durationMinutes = toDisplayMinutes(rawDuration);
  const price = asNumber(firstValue(row, ['pc_price', 'price', 'precio_particular']));
  const activeValue = asNumber(firstValue(row, ['pc_active', 'active', 'activo']));
  const externaValue = asNumber(firstValue(row, ['pc_externo', 'externo']));
  const visibleAgendaValue = asNumber(firstValue(row, ['pc_visible_agenda', 'visible_agenda']));
  const imEspecialidad = normalizeImEspecialidad(
    firstValue(row, ['im_especialidad', 'imEspecialidad', 'IM_ESPECIALIDAD'])
  );

  return {
    id,
    pc_catid: id,
    pc_codmaipo: codigoInterno,
    pc_focod: codigoFonasa,
    pc_catname: nombre,
    pc_namemaipo: pc_namemaipo || nombre,
    pc_duration: rawDuration,
    pc_especialidad: asNumber(firstValue(row, ['pc_especialidad', 'specialty_id', 'especialidad_id'])),
    im_especialidad: imEspecialidad,
    pc_price: price,
    pc_foprice: asNumber(firstValue(row, ['pc_foprice'])),
    pc_foprice1_cp: asNumber(firstValue(row, ['pc_foprice1_cp'])),
    pc_foprice2: asNumber(firstValue(row, ['pc_foprice2'])),
    pc_foprice2_cp: asNumber(firstValue(row, ['pc_foprice2_cp'])),
    pc_foprice3: asNumber(firstValue(row, ['pc_foprice3'])),
    pc_foprice3_cp: asNumber(firstValue(row, ['pc_foprice3_cp'])),
    pc_active: activeValue,
    pc_externo: externaValue,
    pc_visible_agenda: visibleAgendaValue,
    pc_particular: asNumber(firstValue(row, ['pc_particular', 'particular'])),
    pc_aut_fonasa: asNumber(firstValue(row, ['pc_aut_fonasa', 'aut_fonasa'])),
    pc_asoc_plan: asNumber(firstValue(row, ['pc_asoc_plan', 'asoc_plan'])),
    modalidad: modalidadValue || null,
    tipo_presentacion: asNumber(firstValue(row, ['tipo_presentacion', 'type_presentacion'])) || undefined,
    pc_end_date_flag: asNumber(firstValue(row, ['pc_end_date_flag', 'end_date_flag'])) || 0,
    orden_medica: asNumber(firstValue(row, ['orden_medica'])),
    pc_catcolor: asText(firstValue(row, ['pc_catcolor', 'catcolor'])),
    pc_catdesc: asText(firstValue(row, ['pc_catdesc', 'descripcion'])),
    pc_preparacion: asText(firstValue(row, ['pc_preparacion', 'preparacion'])),
    copagoFn1: asNumber(firstValue(row, ['pc_foprice1_cp'])),
    totalFn1: asNumber(firstValue(row, ['pc_foprice'])),
    especialidad: especialidad || 'Sin especialidad',
    modalidadLabel: asText(
      firstValue(row, ['name_modality', 'modalidad_nombre', 'nombre_modalidad'])
        ?? (row.modalidad && isRecord(row.modalidad) ? firstValue(row.modalidad, ['name_modality', 'name', 'nombre']) : undefined)
    ) || undefined,
    duracion: durationMinutes,
    precioParticular: price,
    activa: activeValue === 1 ? 'Si' : 'No',
    externa: externaValue === 1 ? 'Si' : 'No',
    visibleAgenda: visibleAgendaValue === 1 ? 'Si' : 'No',
    nombre,
    codigoInterno,
    codigoFonasa,
  };
}

export function buildModalidadesUrl(): string {
  const baseUrl = ENV.API_BASE_URL.trim();
  if (!baseUrl) {
    return '/modalities';
  }
  if (baseUrl.endsWith('/api_nestjs')) {
    return '/modalities';
  }
  return '/api_nestjs/modalities';
}

export const prestacionesService = {
  async getPrestaciones(): Promise<Prestacion[]> {
    const response = await api.get<unknown>('/categorie');
    const rows = buildRows(response.data);
    const prestaciones = rows
      .map((row) => parsePrestacionRow(row))
      .filter((row): row is Prestacion => row !== null);
    if (rows.length > 0 && prestaciones.length === 0) {
      throw new Error('La respuesta no contiene prestaciones con identificadores válidos.');
    }
    return prestaciones;
  },

  async getSpecialties(): Promise<Specialty[]> {
    const response = await api.get<unknown>('/specialties');
    const data = response.data;
    const rows = buildRows(data);

    return rows.flatMap((row) => {
      if (!isRecord(row)) {
        return [];
      }
      const optionId = firstValue(row, ['option_id', 'id', 'specialty_id']);
      const title = firstValue(row, ['title', 'name', 'nombre']);
      if (optionId === undefined || title === undefined) {
        return [];
      }
      return [{ option_id: String(optionId), title: asText(title) }];
    });
  },

  async getModalidades(): Promise<ModalidadOption[]> {
    const response = await api.get<unknown>(buildModalidadesUrl());
    const rows = buildRows(response.data);
    return rows.flatMap((row) => {
      if (!isRecord(row)) {
        return [];
      }
      const id = positiveInteger(firstValue(row, ['id', 'modality_id', 'id_modalidad']));
      const name = asText(firstValue(row, ['name_modality', 'name', 'nombre', 'title']));
      if (!id || !name) {
        return [];
      }
      return [{ id, name_modality: name, acronimo: asText(firstValue(row, ['acronimo', 'sigla'])) || undefined }];
    });
  },

  async getPrestacionDetail(id: number): Promise<Record<string, unknown>> {
    const response = await api.get<unknown>(`/categorie/detail/${id}`);
    const data = response.data;
    throwIfApiError(data);
    if (isRecord(data)) {
      if (isRecord(data.data)) {
        throwIfApiError(data.data);
        return data.data;
      }
      return data;
    }
    return {};
  },

  async createPrestacion(payload: PrestacionCreatePayload): Promise<unknown> {
    const response = await api.post<unknown>('/categorie', payload);
    throwIfApiError(response.data);
    return response.data;
  },

  async updatePrestacion(id: number, payload: PrestacionUpdatePayload): Promise<unknown> {
    const response = await api.put<unknown>(`/categorie/${id}`, payload);
    throwIfApiError(response.data);
    return response.data;
  },

  async toggleStatus(id: number, active: 0 | 1): Promise<unknown> {
    const response = await api.patch<unknown>(`/categorie/${id}/toggle-status`, { active });
    throwIfApiError(response.data);
    return response.data;
  },
};
