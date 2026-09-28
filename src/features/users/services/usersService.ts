import api from "@/api/axiosClient";
import type {
  SystemUser,
  UserAsset,
  UserCatalogResult,
  UserCatalogs,
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

function normalizeUser(value: unknown): SystemUser | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = Number(value.id);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  const active = value.active;
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
    active:
      active !== false && active !== 0 && active !== "0" && active !== "false",
  } as SystemUser;
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

export const usersService = {
  async getUsers(): Promise<SystemUser[]> {
    const response = await api.get<unknown>("/users");
    return asRows(response.data)
      .map(normalizeUser)
      .filter((user): user is SystemUser => user !== null);
  },

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
    const response = await api.get<unknown>(`/users/${id}`);
    const user = normalizeUser(unwrapPayload(response.data));
    if (!user) {
      throw new Error("La respuesta del detalle de usuario no es válida.");
    }
    return user;
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
};
