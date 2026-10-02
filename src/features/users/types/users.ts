export type SystemUser = {
  id: number;
  username: string;
  fname?: string;
  mname?: string;
  lname?: string;
  federaltaxid?: string;
  email?: string;
  user_group?: number | string;
  authorized?: boolean | number | string;
  active?: boolean | number | string;
  birthday?: string;
  phonecell?: string;
  street?: string;
  state?: number | string;
  city?: number | string;
  erxrole?: string;
  edad_i?: number | string;
  specialty?: string;
  facility_id?: (number | string)[];
  especialidades?: (number | string)[];
  foto_url?: string;
  firma_url?: string;
  foto?: string;
  firma?: string;
  info?: string;
};

export type UserGroupOption = { id: string; label: string };
export type UserFacility = { id: number; name: string };
export type UserSpecialty = { option_id: string; title: string };
export type UserRegion = { id_region: number; region: string };
export type UserCommune = { id: number; nombre: string; region: number };
export type UserCategory = {
  id: number;
  codigo?: string;
  nombre?: string;
  name?: string;
  specialty_id?: number | string | null;
  pc_especialidad?: number | string | null;
  active?: boolean | number | string;
  pc_active?: boolean | number | string;
};

export type UserCatalogs = {
  groups: UserGroupOption[];
  facilities: UserFacility[];
  specialties: UserSpecialty[];
  regions: UserRegion[];
  communes: UserCommune[];
};

export type UserCatalogResult = {
  catalogs: UserCatalogs;
  failed: string[];
};

export type UserAsset = {
  uri: string;
  name: string;
  mimeType: string;
  file?: Blob | null;
};

export type UserFormValues = {
  username: string;
  stiltskin: string;
  repeatPassword: string;
  federaltaxid: string;
  fname: string;
  mname: string;
  lname: string;
  birthday: string;
  email: string;
  user_group: string;
  specialty: string;
  phonecell: string;
  street: string;
  state: string;
  city: string;
  erxrole: string;
  edad_i: string;
  info: string;
  authorized: boolean;
  foto_url: string;
  firma_url: string;
  foto: UserAsset | null;
  firma: UserAsset | null;
  facility_id: string[];
  especialidades: string[];
};
