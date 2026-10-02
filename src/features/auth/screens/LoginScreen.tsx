import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
} from "react-native";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function LoginScreen() {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <LoginForm />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardArea: { flex: 1 },
});
