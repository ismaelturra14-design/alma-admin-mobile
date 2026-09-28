import api from "@/api/axiosClient";
import { ENV } from "@/config/env";

export type EmrOption = { id: number; name: string };

export type PrestationOption = {
  id: number;
  name: string;
  specialtyId?: number;
  specialtyName?: string;
};

export type EmrLink = {
  id: number;
  categorie_id: number;
  emr_id: number;
  prestation_name?: string;
  specialty_name?: string;
  emr_name?: string;
};

export type EmrLinkInput = {
  categorie_id: number;
  emr_id: number;
  user_id: number;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function firstValue(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function unwrap(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if (payload.status === "error" || payload.status === "failed") {
    throw new Error(
      stringValue(payload.message) ?? "No se pudo completar la solicitud.",
    );
  }
  return "data" in payload ? payload.data : payload;
}

function rowsFrom(payload: unknown, collectionKeys: string[]): unknown[] {
  let data = unwrap(payload);
  if (isRecord(data)) {
    data = firstValue(data, collectionKeys) ?? data;
  }
  if (!Array.isArray(data)) {
    throw new Error("La respuesta del servidor no contiene una lista válida.");
  }
  return data;
}

function requestConfig() {
  return { headers: ENV.API_KEY ? { api_key: ENV.API_KEY } : undefined };
}

function parseEmrNames(payload: unknown): EmrOption[] {
  return rowsFrom(payload, ["items", "names", "emr_names", "rows"]).flatMap(
    (value) => {
      if (!isRecord(value)) return [];
      const id = positiveInteger(firstValue(value, ["id", "emr_id"]));
      const name = stringValue(
        firstValue(value, [
          "name",
          "emr_name",
          "name_emr",
          "nombre_emr",
          "nombre",
          "title",
          "label",
        ]),
      );
      return id && name ? [{ id, name }] : [];
    },
  );
}

function parsePrestations(payload: unknown): PrestationOption[] {
  return rowsFrom(payload, [
    "items",
    "categories",
    "prestations",
    "rows",
  ]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const specialty = isRecord(value.specialty)
      ? value.specialty
      : isRecord(value.especialidad)
        ? value.especialidad
        : {};
    const id = positiveInteger(
      firstValue(value, [
        "id",
        "categorie_id",
        "category_id",
        "categoryId",
        "prestacion_id",
        "option_id",
      ]),
    );
    const name = stringValue(
      firstValue(value, [
        "name",
        "categorie_name",
        "categorie",
        "category_name",
        "prestacion_name",
        "prestacion",
        "title",
        "description",
        "label",
        "nombre",
      ]),
    );
    const specialtyId = positiveInteger(
      firstValue(value, [
        "specialty_id",
        "speciality_id",
        "especialidad_id",
        "specialtyId",
      ]) ?? firstValue(specialty, ["id", "option_id"]),
    );
    const specialtyName =
      stringValue(
        firstValue(value, [
          "specialty_name",
          "speciality_name",
          "especialidad",
        ]),
      ) ?? stringValue(firstValue(specialty, ["name", "title"]));

    return id && name
      ? [{ id, name, specialtyId: specialtyId ?? undefined, specialtyName }]
      : [];
  });
}

function parseLinks(payload: unknown): EmrLink[] {
  return rowsFrom(payload, ["items", "links", "rows"]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const category = isRecord(value.categorie)
      ? value.categorie
      : isRecord(value.category)
        ? value.category
        : isRecord(value.prestation)
          ? value.prestation
          : {};
    const emr = isRecord(value.emr) ? value.emr : {};
    const specialty = isRecord(value.specialty)
      ? value.specialty
      : isRecord(value.especialidad)
        ? value.especialidad
        : {};
    const id = positiveInteger(
      firstValue(value, ["id", "link_id", "emr_link_id"]),
    );
    const categorieId = positiveInteger(
      firstValue(value, ["categorie_id", "category_id", "prestation_id"]) ??
        firstValue(category, ["id", "categorie_id", "category_id"]),
    );
    const emrId = positiveInteger(
      firstValue(value, ["emr_id", "emrId"]) ??
        firstValue(emr, ["id", "emr_id"]),
    );
    if (!id || !categorieId || !emrId) return [];

    return [
      {
        id,
        categorie_id: categorieId,
        emr_id: emrId,
        prestation_name:
          stringValue(
            firstValue(value, [
              "prestation_name",
              "categorie_name",
              "category_name",
              "prestacion",
            ]),
          ) ??
          stringValue(firstValue(category, ["name", "title", "description"])),
        specialty_name:
          stringValue(
            firstValue(value, [
              "specialty_name",
              "speciality_name",
              "especialidad",
            ]),
          ) ?? stringValue(firstValue(specialty, ["name", "title"])),
        emr_name:
          stringValue(
            firstValue(value, ["emr_name", "name_emr", "nombre_emr"]),
          ) ??
          stringValue(firstValue(emr, ["name", "emr_name", "nombre", "title"])),
      },
    ];
  });
}

function assertSuccess(payload: unknown): void {
  if (isRecord(payload) && payload.status && payload.status !== "success") {
    throw new Error(
      stringValue(payload.message) ??
        "El servidor no pudo completar la acción.",
    );
  }
}

export const emrLinksService = {
  async getNames(): Promise<EmrOption[]> {
    const response = await api.get<unknown>(
      "/emr-links/names",
      requestConfig(),
    );
    return parseEmrNames(response.data);
  },

  async getAll(): Promise<EmrLink[]> {
    const response = await api.get<unknown>("/emr-links", requestConfig());
    return parseLinks(response.data);
  },

  async getPrestations(): Promise<PrestationOption[]> {
    const response = await api.get<unknown>("/categorie", requestConfig());
    return parsePrestations(response.data);
  },

  async create(input: EmrLinkInput): Promise<void> {
    const response = await api.post<unknown>(
      "/emr-links",
      input,
      requestConfig(),
    );
    assertSuccess(response.data);
  },

  async update(id: number, input: EmrLinkInput): Promise<void> {
    const response = await api.put<unknown>(
      `/emr-links/${id}`,
      input,
      requestConfig(),
    );
    assertSuccess(response.data);
  },

  async delete(id: number): Promise<void> {
    const response = await api.delete<unknown>(
      `/emr-links/${id}`,
      requestConfig(),
    );
    assertSuccess(response.data);
  },
};
