import api from "@/api/axiosClient";

export type ManagedGroup = {
  id: number;
  name: string;
  description?: string;
};

export type ManagedUser = Record<string, unknown> & {
  id: number;
  username: string;
  fname?: string;
  mname?: string;
  lname?: string;
  email?: string;
  federaltaxid?: string;
  info?: string;
  user_group?: number | string | null;
  user_group_id?: number | string | null;
  group_id?: number | string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rowsFrom(payload: unknown, label: string): Record<string, unknown>[] {
  const rows =
    isRecord(payload) && "data" in payload ? payload.data : payload;
  if (!Array.isArray(rows)) {
    throw new Error(`La respuesta de ${label} no contiene una lista válida.`);
  }
  return rows.filter(isRecord);
}

function positiveId(value: unknown): number | null {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseGroups(payload: unknown): ManagedGroup[] {
  return rowsFrom(payload, "grupos").flatMap((row) => {
    const id = positiveId(row.id);
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!id || !name) {
      return [];
    }
    return [
      {
        id,
        name,
        description:
          typeof row.description === "string" ? row.description : undefined,
      },
    ];
  });
}

function parseUsers(payload: unknown): ManagedUser[] {
  return rowsFrom(payload, "usuarios").flatMap((row) => {
    const id = positiveId(row.id);
    if (!id) {
      return [];
    }
    return [
      {
        ...row,
        id,
        username: typeof row.username === "string" ? row.username : "",
      } as ManagedUser,
    ];
  });
}

export function getManagedUserGroupId(user: ManagedUser): number | null {
  const rawGroupId = user.user_group ?? user.user_group_id ?? user.group_id;
  return positiveId(rawGroupId);
}

export const groupMaintenanceService = {
  async getGroups(): Promise<ManagedGroup[]> {
    const response = await api.get<unknown>("/users/groups");
    return parseGroups(response.data);
  },

  async getUsers(): Promise<ManagedUser[]> {
    const response = await api.get<unknown>("/users");
    return parseUsers(response.data);
  },

  async getUsersByGroup(groupId: number): Promise<ManagedUser[]> {
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error("El grupo indicado no es válido.");
    }
    const response = await api.get<unknown>(`/users/group/${groupId}`);
    return parseUsers(response.data);
  },

  async updateUserGroup(
    user: ManagedUser,
    groupId: number,
  ): Promise<void> {
    if (!Number.isInteger(user.id) || user.id <= 0) {
      throw new Error("El usuario indicado no es válido.");
    }
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error("El grupo indicado no es válido.");
    }
    await api.put(`/users/${user.id}`, {
      ...user,
      user_group: groupId,
    });
  },
};
