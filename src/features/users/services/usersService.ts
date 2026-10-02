import api from "@/api/axiosClient";
import { emrLinksService } from "@/features/emr-links/services/emrLinksService";
import type {
    SystemUser,
    UserAsset,
    UserCatalogResult,
    UserCatalogs,
    UserCategory,
    UserCommune,
    UserFacility,
    UserFormValues,
    UserGroupOption,
    UserRegion,
    UserSpecialty,
} from "@/features/users/types/users";

type UnknownRecord = Record<string, unknown>;

const emptyCatalogs: UserCatalogs = {
  groups: [],
  facilities: [],
  specialties: [],
  regions: [],
  communes: [],
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapPayload(payload: unknown): unknown {
  return isRecord(payload) && "data" in payload ? payload.data : payload;
}

function asRows(payload: unknown): UnknownRecord[] {
  const value = unwrapPayload(payload);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function firstDefined(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (
      record[key] !== undefined &&
      record[key] !== null &&
      record[key] !== ""
    ) {
      return record[key];
    }
  }
  return undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function normalizedText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function parseGroups(payload: unknown): UserGroupOption[] {
  return asRows(payload).flatMap((item) => {
    const rawId = firstDefined(item, [
      "id",
      "group_id",
      "user_group_id",
      "id_group",
      "value",
      "key",
      "group",
    ]);
    if (rawId === undefined) {
      return [];
    }
    const rawLabel =
      firstDefined(item, [
        "name",
        "group_name",
        "label",
        "descripcion",
        "description",
        "title",
        "nombre",
      ]) ?? rawId;
    return [{ id: String(rawId), label: String(rawLabel) }];
  });
}

function parseFacilities(payload: unknown): UserFacility[] {
  return asRows(payload).flatMap((item) => {
    const id = Number(item.id);
    if (!Number.isInteger(id) || id <= 0 || typeof item.name !== "string") {
      return [];
    }
    return [{ id, name: item.name }];
  });
}

function parseSpecialties(payload: unknown): UserSpecialty[] {
  return asRows(payload).flatMap((item) => {
    const optionId = firstDefined(item, ["option_id"]);
    if (optionId === undefined || typeof item.title !== "string") {
      return [];
    }
    return [{ option_id: String(optionId), title: item.title }];
  });
}

function parseRegions(payload: unknown): UserRegion[] {
  return asRows(payload).flatMap((item) => {
    const idRegion = Number(item.id_region);
    if (!Number.isInteger(idRegion) || typeof item.region !== "string") {
      return [];
    }
    return [{ id_region: idRegion, region: item.region }];
  });
}

function parseCommunes(payload: unknown): UserCommune[] {
  return asRows(payload).flatMap((item) => {
    const id = Number(item.id);
    const region = Number(item.region);
    if (
      !Number.isInteger(id) ||
      typeof item.nombre !== "string" ||
      !Number.isFinite(region)
    ) {
      return [];
    }
    return [{ id, nombre: item.nombre, region }];
  });
}

function normalizeCategory(value: unknown): UserCategory | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = Number(
    firstDefined(value, [
      "pc_catid",
      "id",
      "categorie_id",
      "category_id",
      "prestacion_id",
      "categoryId",
      "prestacionId",
    ]),
  );
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const nombre =
    firstDefined(value, [
      "pc_catname",
      "name",
      "nombre",
      "prestacion_name",
      "prestacion",
      "categoria",
      "title",
      "label",
      "category_name",
    ]) ?? "Sin nombre";

  const codigo = firstDefined(value, [
    "pc_codmaipo",
    "pc_focod",
    "fonasa_code",
    "codigo",
    "code",
    "cat_code",
  ]);

  const specialtyId = firstDefined(value, [
    "specialty_id",
    "pc_especialidad",
    "speciality_id",
    "especialidad_id",
    "specialtyId",
    "specialityId",
  ]);
  const activeValue = firstDefined(value, ["pc_active", "active"]);

  const normalizedSpecialtyId =
    typeof specialtyId === "string" || typeof specialtyId === "number"
      ? specialtyId
      : null;
  const normalizedActiveValue =
    typeof activeValue === "boolean" ||
    typeof activeValue === "number" ||
    typeof activeValue === "string"
      ? activeValue
      : true;

  return {
    id,
    codigo:
      typeof codigo === "string" || typeof codigo === "number"
        ? String(codigo)
        : undefined,
    nombre:
      typeof nombre === "string" ? nombre.trim() || "Sin nombre" : "Sin nombre",
    specialty_id: normalizedSpecialtyId,
    active: normalizedActiveValue,
    pc_active: normalizedActiveValue,
  };
}

async function loadCatalog<T>(
  name: string,
  request: () => Promise<{ data: unknown }>,
  parse: (payload: unknown) => T[],
  empty: T[],
): Promise<{ data: T[]; failed: string }> {
  try {
    const response = await request();
    return { data: parse(response.data), failed: "" };
  } catch {
    return { data: empty, failed: name };
  }
}

function readUserActiveStatus(value: UnknownRecord): boolean | undefined {
  const active = firstDefined(value, [
    "active",
    "pc_active",
    "is_active",
    "user_active",
    "status",
    "estado",
    "pc_status",
  ]);

  if (typeof active === "boolean") {
    return active;
  }
  if (typeof active === "number") {
    return active === 1 ? true : active === 0 ? false : undefined;
  }
  if (typeof active !== "string") {
    return undefined;
  }

  const normalizedStatus = normalizedText(active);
  if (["1", "true", "active", "activo", "s", "si", "yes"].includes(normalizedStatus)) {
    return true;
  }
  if (["0", "false", "inactive", "inactivo", "n", "no", "disabled", "desactivado"].includes(normalizedStatus)) {
    return false;
  }
  return undefined;
}

function normalizeUser(value: unknown): SystemUser | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = Number(value.id);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  const photoUrl = firstDefined(value, [
    "foto_url",
    "foto",
    "urlfoto",
    "photo_url",
    "photo",
    "avatar_url",
  ]);
  const signatureUrl = firstDefined(value, [
    "firma_url",
    "firma",
    "urlfirma",
    "signature_url",
    "signature",
  ]);
  return {
    ...value,
    id,
    username: stringValue(value.username),
    foto_url: stringValue(photoUrl),
    firma_url: stringValue(signatureUrl),
    active: readUserActiveStatus(value),
  } as SystemUser;
}

async function loadUserById(id: number): Promise<SystemUser> {
  const response = await api.get<unknown>(`/users/${id}`);
  const user = normalizeUser(unwrapPayload(response.data));
  if (!user) {
    throw new Error("La respuesta del detalle de usuario no es válida.");
  }

  const usersResponse = await api.get<unknown>("/users");
  const listRecord = asRows(usersResponse.data).find(
    (item) => Number(item.id) === id,
  );
  const listStatus = listRecord ? readUserActiveStatus(listRecord) : undefined;
  if (listStatus !== undefined) {
    user.active = listStatus;
  }

  return user;
}

function appendText(payload: FormData, key: string, value: string): void {
  payload.append(key, value);
}

function appendIfNotEmpty(payload: FormData, key: string, value: string): void {
  if (value) {
    appendText(payload, key, value);
  }
}

function appendAsset(
  payload: FormData,
  field: "foto" | "firma",
  asset: UserAsset | null,
  urlValue: string,
): void {
  if (asset) {
    const uploadKey = field === "firma" ? "urlfirma" : "foto";
    if (asset.file) {
      payload.append(uploadKey, asset.file, asset.name);
    } else {
      const nativeFormData = payload as FormData & {
        append(
          name: string,
          value: { uri: string; name: string; type: string },
        ): void;
      };
      nativeFormData.append(uploadKey, {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      });
    }
  }

  // A newly selected file replaces the existing asset. Do not send its old URL too.
  const cleanUrl = urlValue.trim();
  if (!asset && cleanUrl) {
    appendText(payload, field === "firma" ? "firma_url" : "foto_url", cleanUrl);
  }
}

function toCreateFormData(form: UserFormValues): FormData {
  const payload = new FormData();
  appendText(payload, "username", form.username.trim());
  appendText(payload, "stiltskin", form.stiltskin);
  appendText(payload, "federaltaxid", form.federaltaxid.trim());
  appendText(payload, "fname", form.fname.trim());
  appendText(payload, "lname", form.lname.trim());
  appendText(payload, "birthday", form.birthday);
  appendText(payload, "email", form.email.trim());
  appendText(payload, "user_group", form.user_group);

  appendIfNotEmpty(payload, "mname", form.mname.trim());
  appendIfNotEmpty(payload, "specialty", form.specialty.trim());
  appendIfNotEmpty(payload, "phonecell", form.phonecell.trim());
  appendIfNotEmpty(payload, "street", form.street.trim());
  appendIfNotEmpty(payload, "state", form.state);
  appendIfNotEmpty(payload, "city", form.city);
  appendIfNotEmpty(payload, "erxrole", form.erxrole.trim());
  appendIfNotEmpty(payload, "edad_i", form.edad_i.trim());
  appendIfNotEmpty(payload, "info", form.info.trim());
  if (form.authorized) {
    appendText(payload, "authorized", "1");
  }

  appendAsset(payload, "foto", form.foto, form.foto_url);
  appendAsset(payload, "firma", form.firma, form.firma_url);
  form.facility_id.forEach((id) => appendText(payload, "facility_id", id));
  form.especialidades.forEach((id) =>
    appendText(payload, "especialidades[]", id),
  );
  return payload;
}

function toUpdateFormData(form: UserFormValues): FormData {
  const payload = new FormData();
  appendIfNotEmpty(payload, "stiltskin", form.stiltskin);
  appendIfNotEmpty(payload, "federaltaxid", form.federaltaxid.trim());
  appendIfNotEmpty(payload, "fname", form.fname.trim());
  appendIfNotEmpty(payload, "mname", form.mname.trim());
  appendIfNotEmpty(payload, "lname", form.lname.trim());
  appendIfNotEmpty(payload, "birthday", form.birthday);
  appendIfNotEmpty(payload, "email", form.email.trim());
  appendIfNotEmpty(payload, "user_group", form.user_group);
  appendText(payload, "specialty", form.specialty.trim());
  appendIfNotEmpty(payload, "phonecell", form.phonecell.trim());
  appendIfNotEmpty(payload, "street", form.street.trim());
  appendIfNotEmpty(payload, "state", form.state);
  appendIfNotEmpty(payload, "city", form.city);
  appendIfNotEmpty(payload, "erxrole", form.erxrole.trim());
  appendIfNotEmpty(payload, "edad_i", form.edad_i.trim());
  appendIfNotEmpty(payload, "info", form.info.trim());
  appendText(payload, "authorized", form.authorized ? "1" : "0");

  appendAsset(payload, "foto", form.foto, form.foto_url);
  appendAsset(payload, "firma", form.firma, form.firma_url);
  form.facility_id.forEach((id) => appendText(payload, "facility_id", id));
  form.especialidades.forEach((id) =>
    appendText(payload, "especialidades[]", id),
  );
  return payload;
}

const multipartConfig = {
  headers: { "Content-Type": "multipart/form-data" },
};

export type UserListParams = {
  page: number;
  limit: number;
  search: string;
  status: "all" | "active" | "inactive";
  authorized: "all" | "authorized" | "unauthorized";
  hasRut: boolean | null;
};

export type UserListResult = {
  users: SystemUser[];
  total: number;
  serverPaginated: boolean;
};

function readUserListResult(payload: unknown): UserListResult {
  const root = isRecord(payload) ? payload : null;
  const rowsPayload = root
    ? firstDefined(root, ["data", "items", "results", "users"])
    : payload;
  const users = asRows(rowsPayload)
    .map(normalizeUser)
    .filter((user): user is SystemUser => user !== null);
  const rawTotal = root
    ? firstDefined(root, ["total", "totalItems", "totalCount", "count"])
    : undefined;
  const total = Number(rawTotal);

  return {
    users,
    total: Number.isFinite(total) ? total : users.length,
    serverPaginated: Number.isFinite(total),
  };
}

async function getUsers(): Promise<SystemUser[]>;
async function getUsers(params: UserListParams): Promise<UserListResult>;
async function getUsers(
  params?: UserListParams,
): Promise<SystemUser[] | UserListResult> {
  const response = await api.get<unknown>("/users", {
    params: params
      ? {
          page: params.page,
          limit: params.limit,
          search: params.search,
          status: params.status,
          authorized: params.authorized,
          hasRut: params.hasRut,
        }
      : undefined,
  });
  if (!params) {
    return asRows(response.data)
      .map(normalizeUser)
      .filter((user): user is SystemUser => user !== null);
  }
  return readUserListResult(response.data);
}

export const usersService = {
  getUsers,

  async getUsersByGroup(groupId: number): Promise<SystemUser[]> {
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error("El grupo de usuarios indicado no es válido.");
    }
    const response = await api.get<unknown>(`/users/group/${groupId}`);
    return asRows(response.data)
      .map(normalizeUser)
      .filter((user): user is SystemUser => user !== null);
  },

  async getUser(id: number): Promise<SystemUser> {
    return loadUserById(id);
  },

  async getCatalogs(): Promise<UserCatalogResult> {
    const [groups, facilities, specialties, regions, communes] =
      await Promise.all([
        loadCatalog(
          "grupos",
          () => api.get<unknown>("/users/groups"),
          parseGroups,
          emptyCatalogs.groups,
        ),
        loadCatalog(
          "sucursales",
          () => api.get<unknown>("/facilities"),
          parseFacilities,
          emptyCatalogs.facilities,
        ),
        loadCatalog(
          "especialidades",
          () => api.get<unknown>("/specialties"),
          parseSpecialties,
          emptyCatalogs.specialties,
        ),
        loadCatalog(
          "regiones",
          () => api.get<unknown>("/regions"),
          parseRegions,
          emptyCatalogs.regions,
        ),
        loadCatalog(
          "comunas",
          () => api.get<unknown>("/communes"),
          parseCommunes,
          emptyCatalogs.communes,
        ),
      ]);
    return {
      catalogs: {
        groups: groups.data,
        facilities: facilities.data,
        specialties: specialties.data,
        regions: regions.data,
        communes: communes.data,
      },
      failed: [groups, facilities, specialties, regions, communes]
        .map((result) => result.failed)
        .filter(Boolean),
    };
  },

  async createUser(form: UserFormValues): Promise<void> {
    await api.post("/users", toCreateFormData(form), multipartConfig);
  },

  async updateUser(id: number, form: UserFormValues): Promise<void> {
    await api.put(`/users/${id}`, toUpdateFormData(form), multipartConfig);
  },

  async updateUserStatus(id: number, active: boolean): Promise<void> {
    await api.patch(`/users/${id}/status`, { active: active ? 1 : 0 });
  },

  async getUserCategories(id: number): Promise<UserCategory[]> {
    const response = await api.get<unknown>(`/users/${id}/categories`);
    return asRows(response.data)
      .map(normalizeCategory)
      .filter((category): category is UserCategory => category !== null);
  },

  async getSpecialtyCategories(
    specialtyId: number,
    specialtyName = "",
  ): Promise<UserCategory[]> {
    const selectedId = Number(specialtyId);
    const selectedName = normalizedText(specialtyName);
    const prestations = await emrLinksService.getPrestations();

    return prestations.flatMap((prestation) => {
      const matchesSpecialty =
        prestation.specialtyId !== undefined
          ? prestation.specialtyId === selectedId
          : Boolean(
              prestation.specialtyName &&
                normalizedText(prestation.specialtyName) === selectedName,
            );

      return matchesSpecialty
        ? [
            {
              id: prestation.id,
              nombre: prestation.name,
              specialty_id: prestation.specialtyId ?? selectedId,
              active: true,
              pc_active: true,
            },
          ]
        : [];
    });
  },

  async updateUserCategories(
    id: number,
    categoryIds: (number | string)[],
  ): Promise<void> {
    const user = await loadUserById(id);
    if (user.active === false) {
      throw new Error(
        "No se pueden asignar prestaciones a un usuario inactivo. Actívalo e inténtalo nuevamente.",
      );
    }
    if (user.active !== true) {
      throw new Error(
        "No se pudo confirmar el estado del usuario. Actualiza el listado e inténtalo nuevamente.",
      );
    }

    const normalizedIds = categoryIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    await api.put(`/users/${id}/categories`, { categoryIds: normalizedIds });
  },
};
