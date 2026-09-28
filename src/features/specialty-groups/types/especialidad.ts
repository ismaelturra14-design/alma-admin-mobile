export type Especialidad = {
  option_id: string;
  title: string;
};

export type EspecialidadGroup = {
  id: number;
  name: string;
};

export type EspecialidadLink = {
  id: number;
  specialty_name: string;
  group_name: string;
};

export type SpecialtyGroupInput = {
  name: string;
};

export type SpecialtyLinkInput = {
  specialty_id: number;
  group_id: number;
};
