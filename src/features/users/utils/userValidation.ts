import type { UserFormValues } from "@/features/users/types/users";

export type UserFormMode = "create" | "edit";
export type UserFormField = keyof UserFormValues;
export type UserFormErrors = Partial<Record<UserFormField, string>>;

export function validateUserForm(
  form: UserFormValues,
  mode: UserFormMode,
): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!form.username.trim()) {
    errors.username = "Ingresa el nombre de usuario.";
  }
  if (!form.federaltaxid.trim()) {
    errors.federaltaxid = "Ingresa el RUT.";
  } else if (!/^\d{7,8}-[\dKk]$/.test(form.federaltaxid.trim())) {
    errors.federaltaxid = "Usa el formato 12345678-9 o 12345678-K.";
  }
  if (!form.fname.trim()) {
    errors.fname = "Ingresa los nombres.";
  }
  if (!form.lname.trim()) {
    errors.lname = "Ingresa los apellidos.";
  }
  if (!form.email.trim()) {
    errors.email = "Ingresa el correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }
  if (!form.birthday) {
    errors.birthday = "Ingresa la fecha de nacimiento.";
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(form.birthday);
    const date = match ? new Date(`${form.birthday}T00:00:00`) : null;
    if (
      !match ||
      !date ||
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() + 1 !== Number(match[2]) ||
      date.getDate() !== Number(match[3]) ||
      date.getTime() > new Date().setHours(23, 59, 59, 999)
    ) {
      errors.birthday = "Usa una fecha válida con formato AAAA-MM-DD.";
    }
  }
  if (!form.user_group) {
    errors.user_group = "Selecciona un grupo de usuario.";
  } else if (!/^\d+$/.test(form.user_group)) {
    errors.user_group = "Selecciona un grupo de usuario válido.";
  }

  if (mode === "create" && form.stiltskin.length < 8) {
    errors.stiltskin = "La contraseña debe tener al menos 8 caracteres.";
  } else if (mode === "edit" && form.stiltskin && form.stiltskin.length < 8) {
    errors.stiltskin = "La contraseña debe tener al menos 8 caracteres.";
  }

  if (mode === "create" && !form.repeatPassword) {
    errors.repeatPassword = "Repite la contraseña.";
  }
  if (
    (mode === "create" || form.stiltskin || form.repeatPassword) &&
    form.stiltskin !== form.repeatPassword
  ) {
    errors.repeatPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}
