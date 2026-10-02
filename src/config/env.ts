const envValues: Record<string, string | undefined> = {
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  VITE_API_URL: process.env.VITE_API_URL,
  EXPO_PUBLIC_API_KEY: process.env.EXPO_PUBLIC_API_KEY,
  VITE_API_KEY: process.env.VITE_API_KEY,
  EXPO_PUBLIC_PUBLIC_FILE_BASE_URL: process.env.EXPO_PUBLIC_PUBLIC_FILE_BASE_URL,
  EXPO_PUBLIC_PUBLIC_FILE_URL: process.env.EXPO_PUBLIC_PUBLIC_FILE_URL,
  VITE_PUBLIC_FILE_URL: process.env.VITE_PUBLIC_FILE_URL,
  EXPO_PUBLIC_PLATFORM_ID: process.env.EXPO_PUBLIC_PLATFORM_ID,
  VITE_PLATFORM_ID: process.env.VITE_PLATFORM_ID,
  EXPO_PUBLIC_MAIL_TEMPLATE_CONFIRMACION:
    process.env.EXPO_PUBLIC_MAIL_TEMPLATE_CONFIRMACION,
  VITE_MAIL_TEMPLATE_CONFIRMACION: process.env.VITE_MAIL_TEMPLATE_CONFIRMACION,
  EXPO_PUBLIC_MAIL_TEMPLATE_AGENDAMIENTO:
    process.env.EXPO_PUBLIC_MAIL_TEMPLATE_AGENDAMIENTO,
  VITE_MAIL_TEMPLATE_AGENDAMIENTO: process.env.VITE_MAIL_TEMPLATE_AGENDAMIENTO,
  EXPO_PUBLIC_ALLOWED_CAPACITY_GROUPS:
    process.env.EXPO_PUBLIC_ALLOWED_CAPACITY_GROUPS,
  VITE_ALLOWED_CAPACITY_GROUPS: process.env.VITE_ALLOWED_CAPACITY_GROUPS,
};

const readEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const value = envValues[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return '';



};

const readNumber = (...keys: string[]): number => {  
  const value = readEnv(...keys);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readNumberArray = (...keys: string[]): number[] => {
  const value = readEnv(...keys);

  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
};

export const ENV = {
  API_BASE_URL: readEnv('EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_API_URL', 'VITE_API_URL'),
  API_KEY: readEnv('EXPO_PUBLIC_API_KEY', 'VITE_API_KEY'),
  PUBLIC_FILE_BASE_URL: readEnv(
    'EXPO_PUBLIC_PUBLIC_FILE_BASE_URL',
    'EXPO_PUBLIC_PUBLIC_FILE_URL',
    'VITE_PUBLIC_FILE_URL'
  ),
  PLATFORM_ID: readNumber('EXPO_PUBLIC_PLATFORM_ID', 'VITE_PLATFORM_ID'),
  MAIL_TEMPLATE_CONFIRMACION: readNumber(
    'EXPO_PUBLIC_MAIL_TEMPLATE_CONFIRMACION',
    'VITE_MAIL_TEMPLATE_CONFIRMACION'
  ),
  MAIL_TEMPLATE_AGENDAMIENTO: readNumber(
    'EXPO_PUBLIC_MAIL_TEMPLATE_AGENDAMIENTO',
    'VITE_MAIL_TEMPLATE_AGENDAMIENTO'
  ),
  ALLOWED_CAPACITY_GROUPS: readNumberArray(
    'EXPO_PUBLIC_ALLOWED_CAPACITY_GROUPS',
    'VITE_ALLOWED_CAPACITY_GROUPS'
  ),
} as const;

export default ENV;
