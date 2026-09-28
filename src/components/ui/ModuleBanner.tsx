import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

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
  return (
    <View style={styles.container}>
      <View style={styles.decorativeCircle} />
      <View style={styles.iconFrame}>
        <Ionicons name={icon} size={25} color="#fff" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
    backgroundColor: colors.primaryDark,
  },
  decorativeCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    right: -55,
    top: -84,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  iconFrame: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: "#bfdbfe",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#dbeafe", fontSize: 12, marginTop: 4, lineHeight: 17 },
});
