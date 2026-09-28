import { router } from "expo-router";
import { useState } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/context/AuthContext";
import { colors } from "@/theme/colors";

export function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Usuario y contraseña son obligatorios.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(username.trim(), password);
      router.replace({ pathname: "/home" });
    } catch (requestError) {
      const message =
        requestError instanceof Error && requestError.message
          ? requestError.message
          : "No se pudo iniciar sesión.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <View style={styles.logoFrame}>
            <Image
              source={require("../../../images/almaAdminLogo.png")}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Logo de Alma Médica"
            />
          </View>
          <Text style={styles.brandName}>Alma Médica</Text>
          <Text style={styles.brandCaption}>PORTAL DE ADMINISTRACIÓN</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>
            Ingresa tus credenciales para continuar.
          </Text>

          <ErrorMessage message={error} />

          <Input
            label="Usuario"
            placeholder="Ingrese su usuario"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            returnKeyType="next"
          />

          <Input
            label="Contraseña"
            placeholder="Ingrese su contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />

          <Button
            title={loading ? "Validando acceso…" : "Ingresar a mi cuenta"}
            style={styles.submitButton}
            disabled={loading}
            onPress={onSubmit}
          />
        </View>

        <View style={styles.securityNote}>
          <Ionicons name="lock-closed-outline" size={15} color="#64748b" />
          <Text style={styles.securityText}>
            Acceso seguro para personal autorizado
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  container: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoFrame: {
    width: 132,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderRadius: 28,
    backgroundColor: "#fff",
    shadowColor: "#0b5e93",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  logo: {
    width: 120,
    height: 108,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },
  brandCaption: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  formCard: {
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: colors.card,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 22,
  },
  submitButton: {
    minHeight: 52,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 20,
  },
  securityText: {
    color: "#64748b",
    fontSize: 12,
  },
});
