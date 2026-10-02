import api from '@/api/axiosClient';

export type PermissionGroup = {
  id: number;
  name: string;
};

export type ManagedPermission = {
  id: number;
  code: string;
  name: string;
  description?: string;
};

export type GroupedPermissions = Record<string, ManagedPermission[]>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapData(value: unknown): unknown {
  return isRecord(value) && 'data' in value ? value.data : value;
}

function firstValue(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseGroups(payload: unknown): PermissionGroup[] {
  const value = unwrapData(payload);
  if (!Array.isArray(value)) {
    throw new Error('La respuesta de grupos no tiene un formato válido.');
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const id = parseId(
      firstValue(item, ['id', 'group_id', 'user_group_id', 'id_group', 'value']),
    );
    if (id === null) {
      return [];
    }

    const name = firstValue(item, [
      'name',
      'group_name',
      'user_group_name',
      'label',
      'nombre',
      'description',
    ]);

    return [{ id, name: String(name ?? `Grupo ${id}`) }];
  });
}

function parsePermission(item: unknown): ManagedPermission | null {
  if (!isRecord(item)) {
    return null;
  }

  const id = parseId(firstValue(item, ['id', 'permission_id', 'permissionId']));
  const code = firstValue(item, ['code', 'permission_code', 'codigo']);
  const name = firstValue(item, ['name', 'permission_name', 'nombre', 'label']);

  if (id === null || typeof code !== 'string') {
    return null;
  }

  return {
    id,
    code,
    name: typeof name === 'string' ? name : code,
    description:
      typeof item.description === 'string' ? item.description : undefined,
  };
}

function parseGroupedPermissions(payload: unknown): GroupedPermissions {
  const value = unwrapData(payload);
  if (!isRecord(value)) {
    throw new Error('La respuesta de permisos no tiene un formato válido.');
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([moduleName, permissions]) => [
        moduleName,
        permissions
          .map(parsePermission)
          .filter((permission): permission is ManagedPermission => permission !== null),
      ]),
  );
}

function parseGroupPermissionIds(payload: unknown): number[] {
  const value = unwrapData(payload);
  const ids = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.permissionIds)
      ? value.permissionIds
      : null;

  if (!ids) {
    throw new Error('La respuesta de asignaciones no tiene un formato válido.');
  }

  return [...new Set(ids.map((item) => parseId(isRecord(item) ? item.id : item)))]
    .filter((id): id is number => id !== null);
}

export const rolePermissionsService = {
  async getGroups(): Promise<PermissionGroup[]> {
    const response = await api.get<unknown>('/users/groups');
    return parseGroups(response.data);
  },

  async getGroupedPermissions(): Promise<GroupedPermissions> {
    const response = await api.get<unknown>('/permissions/grouped');
    return parseGroupedPermissions(response.data);
  },

  async getGroupPermissionIds(groupId: number): Promise<number[]> {
    const response = await api.get<unknown>(`/permissions/group/${groupId}`);
    return parseGroupPermissionIds(response.data);
  },

  async updateGroupPermissions(
    groupId: number,
    permissionIds: number[],
  ): Promise<void> {
    await api.put(`/permissions/group/${groupId}`, { permissionIds });
  },
};