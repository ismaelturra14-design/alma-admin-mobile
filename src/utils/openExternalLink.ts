import { Alert, Linking } from "react-native";

export async function openExternalLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("No se pudo abrir el enlace", "Intenta nuevamente más tarde.");
  }
}
