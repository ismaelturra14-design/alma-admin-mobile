import api from "@/api/axiosClient";

export type SystemInterface = {
  id: number;
  description: string;
  status: 0 | 1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
}

function normalizeStatus(value: unknown): 0 | 1 | null {
  if (value === 1 || value === "1" || value === true) {
    return 1;
  }
  if (value === 0 || value === "0" || value === false) {
    return 0;
  }
  return null;
}

function normalizeInterfaces(payload: unknown): SystemInterface[] {
  return getRows(payload).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const id = typeof row.id === "number" ? row.id : Number(row.id);
    const description =
      typeof row.description === "string" ? row.description.trim() : "";
    const status = normalizeStatus(row.status);

    if (!Number.isInteger(id) || id <= 0 || !description || status === null) {
      return [];
    }

    return [{ id, description, status }];
  });
}

export const systemInterfacesService = {
  async getSystemInterfaces(): Promise<SystemInterface[]> {
    const response = await api.get<unknown>("/system-interfaces");
    return normalizeInterfaces(response.data);
  },

  async updateSystemInterfaceStatus(id: number, status: 0 | 1): Promise<void> {
    await api.patch(`/system-interfaces/${id}/status`, { status });
  },
};
