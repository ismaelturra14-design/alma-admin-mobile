import api from "@/api/axiosClient";

export type FacilityOption = {
  id: number;
  name: string;
};

export type BoxOption = {
  id: number;
  label: string;
};

export type ScreenOption = {
  id: string;
  iden: number;
  label: string;
  facility_id: number;
  facility_name: string;
  name: string;
};

export type BoxScreenAssignment = {
  id: number;
  iden: number;
  facility_id: number;
  facility_name: string;
  box_id: number;
  box_name: string;
  screen_id: string;
  screen_name: string;
};

export type BoxScreenInput = {
  facility_id: number;
  box_id: number;
  screen_id: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).replace(/\s+/g, " ").trim();
  }

  return "";
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toString(value: unknown): string | null {
  const cleaned = normalizeText(value);
  return cleaned ? cleaned : null;
}

function readValue(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    const resolved = key.includes(".")
      ? key.split(".").reduce<unknown>((current, segment) => {
          if (isRecord(current) && segment in current) {
            return current[segment];
          }
          return undefined;
        }, record)
      : record[key];

    if (resolved !== undefined && resolved !== null && resolved !== "") {
      return resolved;
    }
  }

  return undefined;
}

function getRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isRecord(payload)) {
    const data = readValue(payload, ["data", "items", "rows", "result", "boxScreens"]);
    if (Array.isArray(data)) {
      return data;
    }
  }

  return [];
}

function normalizeFacilities(payload: unknown): FacilityOption[] {
  return getRows(payload).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const id =
      toNumber(readValue(row, ["id", "iden", "facility_id", "facilityId"])) ??
      toNumber(readValue(row, ["facility.id", "facility.iden"]));
    const name =
      toString(readValue(row, ["name", "facility_name", "facilityName", "label"])) ??
      toString(readValue(row, ["facility.name", "facility.nombre"]));

    if (id === null || !name) {
      return [];
    }

    return [{ id, name }];
  });
}

function normalizeBoxes(payload: unknown): BoxOption[] {
  return getRows(payload).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const id =
      toNumber(readValue(row, ["id", "iden", "box_id", "boxId"])) ??
      toNumber(readValue(row, ["box.id", "box.iden"]));
    const label =
      toString(readValue(row, ["nombre", "name", "box_name", "boxNumber", "code", "label"])) ??
      toString(readValue(row, ["box.nombre", "box.name", "box.box_number", "box_number"])) ??
      (id !== null ? `Box ${id}` : null);

    if (id === null || !label) {
      return [];
    }

    return [{ id, label }];
  });
}

function normalizeScreens(payload: unknown): ScreenOption[] {
  return getRows(payload).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const iden =
      toNumber(readValue(row, ["iden", "id", "screen_id", "screenId"])) ??
      toNumber(readValue(row, ["screen.id", "screen.iden"]));
    const facilityId =
      toNumber(readValue(row, ["facility_id", "facilityId"])) ??
      toNumber(readValue(row, ["facility.id", "facility_iden"]));
    const name = toString(readValue(row, ["name", "screen_name", "screenName"])) ?? "";
    const facilityName =
      toString(readValue(row, ["facility_name", "facilityName"])) ??
      toString(readValue(row, ["facility.name", "facility.nombre"])) ??
      "";

    if (iden === null || !name) {
      return [];
    }

    const label = facilityName ? `${name} — ${facilityName}` : name;

    return [{
      id: String(iden),
      iden,
      label,
      facility_id: facilityId ?? 0,
      facility_name: facilityName,
      name,
    }];
  });
}

function normalizeAssignments(payload: unknown): BoxScreenAssignment[] {
  return getRows(payload).flatMap((row) => {
    if (!isRecord(row)) {
      return [];
    }

    const iden =
      toNumber(readValue(row, ["iden", "id", "box_screen_id", "assignment_id"])) ??
      toNumber(readValue(row, ["box_screen.id", "boxScreen.id"]));
    const facilityId =
      toNumber(readValue(row, ["facility_id", "facilityId", "facility.id", "facility_iden"])) ??
      toNumber(readValue(row, ["facility.id", "facility.iden"]));
    const boxId =
      toNumber(readValue(row, ["box_id", "boxId", "box.id", "box_iden"])) ??
      toNumber(readValue(row, ["box.id", "box.iden"]));
    const facilityName = toString(readValue(row, ["facility_name", "facilityName"])) ?? "";
    const boxName = toString(readValue(row, ["box_name", "boxName"])) ?? "";
    const screenId = toString(readValue(row, ["screen_id", "screenId"])) ?? "";
    const screenName = toString(readValue(row, ["screen_name", "screenName", "name"])) ?? "";

    if (iden === null || facilityId === null || boxId === null || !screenId) {
      return [];
    }

    return [{
      id: iden,
      iden,
      facility_id: facilityId,
      facility_name: facilityName,
      box_id: boxId,
      box_name: boxName,
      screen_id: screenId,
      screen_name: screenName,
    }];
  });
}

export const boxScreensService = {
  async getAssignments(): Promise<BoxScreenAssignment[]> {
    const response = await api.get<unknown>("/box-screens");
    return normalizeAssignments(response.data);
  },

  async getFacilities(): Promise<FacilityOption[]> {
    const response = await api.get<unknown>("/facilities");
    return normalizeFacilities(response.data);
  },

  async getBoxesByFacility(facilityId: number): Promise<BoxOption[]> {
    const response = await api.get<unknown>(`/boxes/by-facility/${facilityId}`);
    return normalizeBoxes(response.data);
  },

  async getScreens(): Promise<ScreenOption[]> {
    const response = await api.get<unknown>("/screens");
    return normalizeScreens(response.data);
  },

  async createBoxScreen(input: BoxScreenInput): Promise<void> {
    await api.post("/box-screens", input);
  },

  async updateBoxScreen(iden: number, input: BoxScreenInput): Promise<void> {
    await api.put(`/box-screens/${iden}`, input);
  },

  async deleteBoxScreen(iden: number): Promise<void> {
    await api.delete(`/box-screens/${iden}`);
  },
};
