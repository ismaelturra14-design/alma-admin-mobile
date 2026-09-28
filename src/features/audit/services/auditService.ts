import api from "@/api/axiosClient";
import type {
    AuditDetails,
    AuditPage,
    AuditQuery,
    AuditRecord,
} from "@/features/audit/types/audit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeAuditRecord(value: unknown): AuditRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toPositiveInteger(value.id, 0);
  if (!id) {
    return null;
  }

  const details: AuditDetails = isRecord(value.details) ? value.details : {};
  const recordId = value.record_id;

  return {
    id,
    created_at: typeof value.created_at === "string" ? value.created_at : "",
    user_name:
      typeof value.user_name === "string"
        ? value.user_name
        : "Usuario desconocido",
    module: typeof value.module === "string" ? value.module : "—",
    action_type:
      typeof value.action_type === "string" ? value.action_type : "—",
    record_id:
      typeof recordId === "string" || typeof recordId === "number"
        ? recordId
        : null,
    ip_address: typeof value.ip_address === "string" ? value.ip_address : null,
    details,
  };
}

export const auditService = {
  async getAuditPage(query: AuditQuery): Promise<AuditPage> {
    const response = await api.get<unknown>("/audit", { params: query });
    const payload = response.data;

    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw new Error("Respuesta de auditoría inválida");
    }

    const metaValue = isRecord(payload.meta) ? payload.meta : {};
    const data = payload.data
      .map(normalizeAuditRecord)
      .filter((entry): entry is AuditRecord => entry !== null);
    const page = toPositiveInteger(metaValue.page, query.page);
    const limit = toPositiveInteger(metaValue.limit, query.limit);
    const total = Math.max(0, Number(metaValue.total) || data.length);
    const totalPages = toPositiveInteger(
      metaValue.totalPages,
      Math.max(1, Math.ceil(total / limit)),
    );

    return { data, meta: { total, page, limit, totalPages } };
  },
};
