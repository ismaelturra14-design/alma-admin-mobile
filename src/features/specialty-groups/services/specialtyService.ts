import api from "@/api/axiosClient";
import { ENV } from "@/config/env";
import type { Especialidad } from "@/features/specialty-groups/types/especialidad";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSpecialties(payload: unknown): Especialidad[] {
  if (
    !isRecord(payload) ||
    typeof payload.status !== "string" ||
    !Array.isArray(payload.data)
  ) {
    throw new Error(
      "La respuesta de especialidades no tiene el formato esperado.",
    );
  }

  return payload.data.flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const optionId = row.option_id;
    if (
      (typeof optionId !== "string" && typeof optionId !== "number") ||
      typeof row.title !== "string"
    ) {
      return [];
    }

    return [{ option_id: String(optionId), title: row.title }];
  });
}

export const specialtyService = {
  async getSpecialties(): Promise<Especialidad[]> {
    const response = await api.get<unknown>("/specialties", {
      headers: ENV.API_KEY ? { api_key: ENV.API_KEY } : undefined,
    });
    return parseSpecialties(response.data);
  },
};
