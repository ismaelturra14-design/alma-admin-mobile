import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

type ModuleBannerProps = {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  eyebrow?: string;
};

export function ModuleBanner({
  title,
  subtitle,
  icon,
  eyebrow = "SISTEMA & HERRAMIENTAS",
}: ModuleBannerProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primarySoft }]}>
      <View style={[styles.decorativeCircle, { backgroundColor: colors.surfaceSelected }]} />
      <View style={[styles.iconFrame, { backgroundColor: colors.surfaceSelected }]}>
        <Ionicons name={icon} size={25} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>
        <Text style={[styles.title, { color: colors.primaryStrong }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 112,
    overflow: "hidden",
    padding: 17,
    marginBottom: 14,
    borderRadius: 18,
  },
  decorativeCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    right: -55,
    top: -84,
    borderRadius: 80,
  },
  iconFrame: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    borderRadius: 15,
  },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 4, lineHeight: 17 },
});
