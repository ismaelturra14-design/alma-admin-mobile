import api from "@/api/axiosClient";
import { ENV } from "@/config/env";

export type TmReporterLink = {
  id: number;
  tm_id: number;
  reporter_id: number;
  tm_name?: string;
  reporter_name?: string;
  tm_username?: string;
  reporter_username?: string;
};

export type TmReporterLinkInput = Pick<TmReporterLink, "tm_id" | "reporter_id">;

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
      stringValue(payload.message) ?? "No se pudieron cargar los vínculos.",
    );
  }
  if ("data" in payload) return payload.data;
  return payload;
}

function parseLinks(payload: unknown): TmReporterLink[] {
  let data = unwrap(payload);
  if (isRecord(data)) {
    data = firstValue(data, ["items", "links", "rows"]) ?? data;
  }
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de vínculos no contiene una lista válida.");
  }

  return data.flatMap((value) => {
    if (!isRecord(value)) return [];
    const tm = isRecord(value.tm) ? value.tm : {};
    const reporter = isRecord(value.reporter) ? value.reporter : {};
    const id = positiveInteger(firstValue(value, ["id", "link_id"]));
    const tmId = positiveInteger(
      firstValue(value, ["tm_id", "tmId", "tm_user_id"]) ?? tm.id,
    );
    const reporterId = positiveInteger(
      firstValue(value, ["reporter_id", "reporterId", "informant_id"]) ??
        reporter.id,
    );
    if (!id || !tmId || !reporterId) return [];

    return [
      {
        id,
        tm_id: tmId,
        reporter_id: reporterId,
        tm_name:
          stringValue(firstValue(value, ["tm_name", "tm_full_name"])) ??
          stringValue(tm.name),
        reporter_name:
          stringValue(firstValue(value, ["reporter_name", "informant_name"])) ??
          stringValue(reporter.name),
        tm_username:
          stringValue(firstValue(value, ["tm_username"])) ??
          stringValue(tm.username),
        reporter_username:
          stringValue(firstValue(value, ["reporter_username"])) ??
          stringValue(reporter.username),
      },
    ];
  });
}

function requestConfig() {
  return { headers: ENV.API_KEY ? { api_key: ENV.API_KEY } : undefined };
}

function assertSuccess(payload: unknown): void {
  if (isRecord(payload) && payload.status && payload.status !== "success") {
    throw new Error(
      stringValue(payload.message) ??
        "El servidor no pudo completar la acción.",
    );
  }
}

export const tmReporterLinksService = {
  async getAll(): Promise<TmReporterLink[]> {
    const response = await api.get<unknown>(
      "/tm-reporter-links",
      requestConfig(),
    );
    return parseLinks(response.data);
  },
  async create(input: TmReporterLinkInput): Promise<void> {
    const response = await api.post<unknown>(
      "/tm-reporter-links",
      input,
      requestConfig(),
    );
    assertSuccess(response.data);
  },
  async update(id: number, input: TmReporterLinkInput): Promise<void> {
    const response = await api.put<unknown>(
      `/tm-reporter-links/${id}`,
      input,
      requestConfig(),
    );
    assertSuccess(response.data);
  },
  async delete(id: number): Promise<void> {
    const response = await api.delete<unknown>(
      `/tm-reporter-links/${id}`,
      requestConfig(),
    );
    assertSuccess(response.data);
  },
};
