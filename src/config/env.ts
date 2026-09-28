export const ENV = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    "https://starfish-app-2-5jds5.ondigitalocean.app/api_nestjs",
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || "",
  PUBLIC_FILE_BASE_URL: process.env.EXPO_PUBLIC_FILE_BASE_URL || "",
};
