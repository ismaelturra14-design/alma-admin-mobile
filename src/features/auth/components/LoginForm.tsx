import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/Input";
import { Elevation, Motion, Radii, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function LoginForm() {
  const { login } = useAuth();
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
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
        <Animated.View entering={reduceMotion === false ? FadeInDown.duration(Motion.duration.medium) : undefined} style={styles.brandBlock}>
          <View style={[styles.logoFrame, { backgroundColor: colors.surface }]}>
            <Image
              source={require("../../../images/almaAdminLogo.png")}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Logo de Alma Médica"
            />
          </View>
          <Text style={[styles.brandName, { color: colors.primaryStrong }]}>Alma Médica</Text>
          <Text style={[styles.brandCaption, { color: colors.textSecondary }]}>PORTAL DE ADMINISTRACIÓN</Text>
        </Animated.View>

        <Animated.View entering={reduceMotion === false ? FadeInDown.delay(90).duration(Motion.duration.medium) : undefined} style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Bienvenido de nuevo</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
        </Animated.View>

        <Animated.View entering={reduceMotion === false ? FadeInDown.delay(180).duration(Motion.duration.medium) : undefined} style={styles.securityNote}>
          <Ionicons name="lock-closed-outline" size={15} color={colors.textSecondary} accessibilityLabel="Acceso seguro" />
          <Text style={[styles.securityText, { color: colors.textSecondary }]}>
            Acceso seguro para personal autorizado
          </Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
  },
  container: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: Spacing.five,
  },
  logoFrame: {
    width: 132,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderRadius: Radii.large,
    ...Elevation.medium,
  },
  logo: {
    width: 120,
    height: 108,
  },
  brandName: {
    ...Typography.h2,
  },
  brandCaption: {
    marginTop: Spacing.one,
    ...Typography.caption,
    fontWeight: "800",
  },
  formCard: {
    padding: Spacing.five,
    borderRadius: Radii.large,
    borderWidth: 1,
    ...Elevation.low,
  },
  title: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.one,
    marginBottom: Spacing.five,
  },
  submitButton: {
    minHeight: 52,
    marginTop: 4,
    borderRadius: Radii.medium,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  securityText: {
    ...Typography.caption,
  },
});
