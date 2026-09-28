import api from "@/api/axiosClient";

export type ManagedScreen = {
  iden: number;
  name: string;
  facility_id: number;
  facility_name: string;
};

export type FacilityOption = {
  iden: number;
  name: string;
};

export type ScreenInput = {
  facility: number;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

function asNumber(value: unknown): number | null {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) && result > 0 ? result : null;
}

function normalizeScreens(payload: unknown): ManagedScreen[] {
  return getRows(payload).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const iden = asNumber(row.iden);
    const facilityId = asNumber(row.facility_id);
    const name = typeof row.name === "string" ? row.name.trim() : "";

    if (iden === null || facilityId === null || !name) {
      return [];
    }

    return [
      {
        iden,
        name,
        facility_id: facilityId,
        facility_name:
          typeof row.facility_name === "string" ? row.facility_name : "",
      },
    ];
  });
}

function normalizeFacilities(payload: unknown): FacilityOption[] {
  return getRows(payload).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const iden = asNumber(row.iden ?? row.facility_id ?? row.id);
    const nameValue = row.name ?? row.facility_name ?? row.label;
    const name = typeof nameValue === "string" ? nameValue.trim() : "";

    if (iden === null || !name) {
      return [];
    }

    return [{ iden, name }];
  });
}

export const screensService = {
  async getScreens(): Promise<ManagedScreen[]> {
    const response = await api.get<unknown>("/screens");
    return normalizeScreens(response.data);
  },

  async getFacilities(): Promise<FacilityOption[]> {
    const response = await api.get<unknown>("/facilities");
    return normalizeFacilities(response.data);
  },

  async createScreen(input: ScreenInput): Promise<void> {
    await api.post("/screens", input);
  },

  async updateScreen(iden: number, input: ScreenInput): Promise<void> {
    await api.put(`/screens/${iden}`, input);
  },

  async deleteScreen(iden: number): Promise<void> {
    await api.delete(`/screens/${iden}`);
  },
};
