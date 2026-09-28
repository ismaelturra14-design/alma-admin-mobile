import api from "@/api/axiosClient";
import { ENV } from "@/config/env";
import type {
    EspecialidadGroup,
    EspecialidadLink,
    SpecialtyGroupInput,
    SpecialtyLinkInput,
} from "@/features/specialty-groups/types/especialidad";

type ApiEnvelope = {
  status: string;
  data: unknown;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function requestConfig() {
  return {
    headers: ENV.API_KEY ? { api_key: ENV.API_KEY } : undefined,
  };
}

function unwrapEnvelope(payload: unknown): unknown {
  if (!isRecord(payload) || typeof payload.status !== "string") {
    throw new Error("La respuesta del servidor no tiene el formato esperado.");
  }

  const envelope = payload as ApiEnvelope;
  if (envelope.status !== "success") {
    throw new Error(
      typeof envelope.message === "string"
        ? envelope.message
        : "El servidor no pudo completar la solicitud.",
    );
  }

  return envelope.data;
}

function parseRows(payload: unknown, label: string): Record<string, unknown>[] {
  const data = unwrapEnvelope(payload);
  if (!Array.isArray(data)) {
    throw new Error(`La respuesta de ${label} no contiene una lista válida.`);
  }
  return data.filter(isRecord);
}

function parseGroups(payload: unknown): EspecialidadGroup[] {
  return parseRows(payload, "agrupaciones").flatMap((row) => {
    const id = asPositiveInteger(row.id);
    const name = typeof row.name === "string" ? row.name.trim() : "";
    return id && name ? [{ id, name }] : [];
  });
}

function parseLinks(payload: unknown): EspecialidadLink[] {
  return parseRows(payload, "vínculos").flatMap((row) => {
    const id = asPositiveInteger(row.id);
    const specialtyName =
      typeof row.specialty_name === "string" ? row.specialty_name.trim() : "";
    const groupName =
      typeof row.group_name === "string" ? row.group_name.trim() : "";

    return id && specialtyName && groupName
      ? [{ id, specialty_name: specialtyName, group_name: groupName }]
      : [];
  });
}

export const specialtyGroupsService = {
  async getGroups(): Promise<EspecialidadGroup[]> {
    const response = await api.get<unknown>(
      "/specialty-groups",
      requestConfig(),
    );
    return parseGroups(response.data);
  },

  async createGroup(input: SpecialtyGroupInput): Promise<void> {
    const response = await api.post<unknown>(
      "/specialty-groups",
      input,
      requestConfig(),
    );
    unwrapEnvelope(response.data);
  },

  async updateGroup(id: number, input: SpecialtyGroupInput): Promise<void> {
    const response = await api.put<unknown>(
      `/specialty-groups/${id}`,
      input,
      requestConfig(),
    );
    unwrapEnvelope(response.data);
  },

  async deleteGroup(id: number): Promise<void> {
    const response = await api.delete<unknown>(
      `/specialty-groups/${id}`,
      requestConfig(),
    );
    unwrapEnvelope(response.data);
  },

  async getLinks(): Promise<EspecialidadLink[]> {
    const response = await api.get<unknown>(
      "/specialty-groups/links",
      requestConfig(),
    );
    return parseLinks(response.data);
  },

  async createLink(input: SpecialtyLinkInput): Promise<void> {
    const response = await api.post<unknown>(
      "/specialty-groups/links",
      input,
      requestConfig(),
    );
    unwrapEnvelope(response.data);
  },

  async deleteLink(id: number): Promise<void> {
    const response = await api.delete<unknown>(
      `/specialty-groups/links/${id}`,
      requestConfig(),
    );
    unwrapEnvelope(response.data);
  },
};
