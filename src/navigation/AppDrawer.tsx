import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AccessDeniedScreen } from "@/components/auth/AccessDeniedScreen";
import { ActionButton } from "@/components/ui/ActionButton";
import { Motion, Radii, Spacing, Typography } from "@/constants/theme";
import { AuditPermissionsScreen } from "@/features/audit/screens/AuditPermissionsScreen";
import { useAuth } from "@/features/auth/context/AuthContext";
import { subscribeToApiForbidden } from "@/features/auth/services/authSessionEvents";
import { BoxScreensScreen } from "@/features/box-screens/screens/BoxScreensScreen";
import { EmrLinksScreen } from "@/features/emr-links/screens/EmrLinksScreen";
import { GroupMaintenanceScreen } from "@/features/group-maintenance/screens/GroupMaintenanceScreen";
import { HomeOverview } from "@/features/home/components/HomeOverview";
import { PaymentMethodsScreen } from "@/features/payment-methods/screens/PaymentMethodsScreen";
import { PrestacionesScreen } from "@/features/prestaciones/screens/PrestacionesScreen";
import { RolePermissionsScreen } from "@/features/role-permissions/screens/RolePermissionsScreen";
import { MantenedorPantallasScreen } from "@/features/screen-maintenance/screens/MantenedorPantallasScreen";
import { SpecialtyGroupingScreen } from "@/features/specialty-groups/screens/SpecialtyGroupingScreen";
import { SystemInterfacesScreen } from "@/features/system-interfaces/screens/SystemInterfacesScreen";
import { TmReporterLinksScreen } from "@/features/tm-reporter-links/screens/TmReporterLinksScreen";
import { UsersManagementScreen } from "@/features/users/screens/UsersManagementScreen";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getVisibleMenuSections } from "@/navigation/menuConfig";
import { ModulePlaceholderScreen } from "@/screens/modules/ModulePlaceholderScreen";

type ModuleScreen = {
  id: string;
  label: string;
  description: string;
};

const moduleScreens: Record<string, ModuleScreen> = {
  Inicio: {
    id: "inicio",
    label: "Inicio",
    description: "Panel principal de Alma Admin Mobile.",
  },
  UsuariosDelSistema: {
    id: "usuarios-del-sistema",
    label: "Usuarios del Sistema",
    description: "Administración de usuarios y accesos del sistema.",
  },
  Prestaciones: {
    id: "prestaciones",
    label: "Prestaciones",
    description: "Módulo de prestaciones del sistema.",
  },
  AgrupacionEspecialidades: {
    id: "agrupacion-especialidades",
    label: "Agrupación Especialidades",
    description: "Gestión de agrupación y clasificación de especialidades.",
  },
  VinculosEMR: {
    id: "vinculos-emr",
    label: "Vínculos EMR",
    description: "Integración y administración de vínculos EMR.",
  },
  VinculosTMInformante: {
    id: "vinculos-tm-informante",
    label: "Vínculos TM-Informante",
    description: "Gestión de vínculos con TM-Informante.",
  },
  Caja: {
    id: "caja",
    label: "Caja",
    description: "Operaciones de caja y flujo de pagos.",
  },
  MantenedorGrupos: {
    id: "mantenedor-grupos",
    label: "Mantenedor Grupos",
    description: "Mantenimiento de grupos y configuración de acceso.",
  },
  RolesPermisos: {
    id: "roles-permisos",
    label: "Roles y Permisos",
    description: "Configuración de roles y permisos del sistema.",
  },
  AuditoriaPermisos: {
    id: "auditoria-permisos",
    label: "Auditoría de permisos",
    description: "Consulta y revisión de cambios de permisos.",
  },
  BoxPantalla: {
    id: "box-pantalla",
    label: "Box Pantalla",
    description: "Configuración y administración de pantallas.",
  },
  MantenedorPantallas: {
    id: "mantenedor-pantallas",
    label: "Mantenedor Pantallas",
    description: "Mantenimiento del catálogo de pantallas del sistema.",
  },
  GestionTotem: {
    id: "gestion-totem",
    label: "Gestión Totem",
    description: "Administración de totems y pantallas de información.",
  },
  Interfaces: {
    id: "interfaces",
    label: "Interfaces",
    description: "Integración y mantenimiento de interfaces del sistema.",
  },
  Financiadores: {
    id: "financiadores",
    label: "Financiadores",
    description: "Gestión de financiadores del sistema.",
  },
  TiposPago: {
    id: "tipos-pago",
    label: "Tipos de Pago",
    description: "Administración de tipos de pago.",
  },
  MetodosPago: {
    id: "metodos-pago",
    label: "Métodos de Pago",
    description: "Configuración de métodos de pago.",
  },
  RelacionPagos: {
    id: "relacion-pagos",
    label: "Relación de Pagos",
    description: "Consulta y administración de relaciones de pagos.",
  },
};

export function AppDrawer() {
  const { user, logout, hasAnyPermission } = useAuth();
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(windowWidth * 0.86, 340);
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreenId, setActiveScreenId] = useState("inicio");
  const [apiDenied, setApiDenied] = useState(false);
  const translateX = useSharedValue(-(drawerWidth + 1));

  const menuSections = useMemo(
    () =>
      getVisibleMenuSections(user?.user_group_id ?? null)
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              !item.permissions?.length || hasAnyPermission(item.permissions),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [user?.user_group_id, hasAnyPermission],
  );

  const activeScreen = useMemo(() => {
    const selected = Object.values(moduleScreens).find(
      (screen) => screen.id === activeScreenId,
    );
    return selected ?? moduleScreens.Inicio;
  }, [activeScreenId]);

  const canOpenActiveScreen = useMemo(
    () =>
      activeScreen.id === "inicio" ||
      menuSections.some((section) =>
        section.items.some(
          (item) => moduleScreens[item.route]?.id === activeScreen.id,
        ),
      ),
    [activeScreen.id, menuSections],
  );

  useEffect(
    () => subscribeToApiForbidden(() => setApiDenied(true)),
    [],
  );

  useEffect(() => {
    const target = isOpen ? 0 : -(drawerWidth + 1);
    if (reduceMotion !== false) {
      translateX.value = target;
      return;
    }
    translateX.value = withTiming(target, {
      duration: Motion.duration.medium,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [drawerWidth, isOpen, reduceMotion, translateX]);

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.replace("/login");
  };

  const fullName = user ? `${user.user_fname} ${user.user_lname}`.trim() || "—" : "—";
  const groupName = user?.user_group_name ?? "—";
  const initials =
    (user ? `${user.user_fname} ${user.user_lname}` : "—")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "—";

  const handleSelectModule = (route: string) => {
    const isVisible = menuSections.some((section) =>
      section.items.some((item) => item.route === route),
    );
    if (!isVisible) {
      setApiDenied(false);
      setIsOpen(false);
      return;
    }

    const nextScreen = moduleScreens[route as keyof typeof moduleScreens];
    if (nextScreen) {
      setActiveScreenId(nextScreen.id);
    }
    setApiDenied(false);
    setIsOpen(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isOpen ? "Cerrar menú" : "Abrir menú"}
            accessibilityHint="Muestra los módulos disponibles."
            style={[styles.menuButton, { backgroundColor: colors.primarySoft }]}
            onPress={() => setIsOpen((prev) => !prev)}
          >
            <Ionicons name={isOpen ? "close" : "menu-outline"} size={22} color={colors.primary} accessibilityLabel="Menú" accessibilityHint="Abre o cierra la navegación." />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>{activeScreen.label}</Text>

          <View accessibilityRole="image" accessibilityLabel={`Perfil de ${fullName}`} style={[styles.userBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.userBadgeText, { color: colors.surface }]}>{initials}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {apiDenied || !canOpenActiveScreen ? (
            <AccessDeniedScreen
              description={
                apiDenied
                  ? "El servidor rechazó esta operación para tu cuenta. La sesión sigue activa."
                  : undefined
              }
            />
          ) : activeScreen.id === "inicio" ? (
            <HomeOverview user={user} menuSections={menuSections} onSelectModule={handleSelectModule} />
          ) : activeScreen.id === "box-pantalla" ? (
            <BoxScreensScreen />
          ) : activeScreen.id === "mantenedor-pantallas" ? (
            <MantenedorPantallasScreen />
          ) : activeScreen.id === "metodos-pago" ? (
            <PaymentMethodsScreen />
          ) : activeScreen.id === "prestaciones" ? (
            <PrestacionesScreen />
          ) : activeScreen.id === "usuarios-del-sistema" ? (
            <UsersManagementScreen />
          ) : activeScreen.id === "mantenedor-grupos" ? (
            <GroupMaintenanceScreen />
          ) : activeScreen.id === "auditoria-permisos" ? (
            <AuditPermissionsScreen />
          ) : activeScreen.id === "roles-permisos" ? (
            <RolePermissionsScreen />
          ) : activeScreen.id === "interfaces" ? (
            <SystemInterfacesScreen />
          ) : activeScreen.id === "agrupacion-especialidades" ? (
            <SpecialtyGroupingScreen />
          ) : activeScreen.id === "vinculos-emr" ? (
            <EmrLinksScreen />
          ) : activeScreen.id === "vinculos-tm-informante" ? (
            <TmReporterLinksScreen />
          ) : (
            <ModulePlaceholderScreen
              title={activeScreen.label}
              description={activeScreen.description}
            />
          )}
        </View>

        {isOpen ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar menú" accessibilityHint="Cierra el menú lateral." style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setIsOpen(false)} />
        ) : null}

        <Animated.View
          pointerEvents={isOpen ? "auto" : "none"}
          style={[styles.drawer, { width: drawerWidth, backgroundColor: colors.surface, borderRightColor: colors.border }, drawerAnimatedStyle]}
        >
          <View style={[styles.drawerHeader, { backgroundColor: colors.primarySoft, borderBottomColor: colors.border }]}>
            <View style={styles.drawerBrandRow}>
              <View style={[styles.drawerLogoFrame, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Image
                  source={require("../images/almaAdminLogoTransparent.png")}
                  style={styles.drawerLogo}
                  contentFit="contain"
                  accessibilityLabel="Logo de Alma Médica"
                />
              </View>
              <View style={styles.drawerBrandCopy}>
                <Text style={[styles.drawerBrand, { color: colors.primaryStrong }]}>Alma Admin</Text>
                <Text style={[styles.drawerTagline, { color: colors.primary }]}>GESTIÓN CLÍNICA</Text>
              </View>
            </View>
            <View style={styles.drawerProfile}>
              <View style={[styles.drawerAvatar, { backgroundColor: colors.surfaceSelected }]}>
                <Text style={[styles.drawerAvatarText, { color: colors.primaryStrong }]}>{initials}</Text>
              </View>
              <View style={styles.drawerProfileCopy}>
                <Text style={[styles.drawerUserName, { color: colors.primaryStrong }]} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={[styles.drawerUserMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {groupName}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={[styles.drawerBody, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.drawerBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {menuSections.map((section) => (
              <View key={section.id} style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>

                {section.items.map((item) => {
                  const isActive =
                    activeScreenId === item.id || activeScreenId === item.route;

                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.menuItem,
                        { backgroundColor: isActive ? colors.surfaceSelected : colors.surface, borderColor: isActive ? colors.primary : colors.border },
                        pressed && styles.menuItemPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      accessibilityHint={`Abre el módulo ${item.label}.`}
                      onPress={() => handleSelectModule(item.route)}
                    >
                      {isActive ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} /> : null}
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={isActive ? colors.primary : colors.textSecondary}
                        accessibilityLabel={item.label}
                        accessibilityHint={`Módulo ${item.label}`}
                      />
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: isActive ? colors.primary : colors.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.logoutContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <ActionButton action="logout" fullWidth onPress={() => void handleLogout()} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: Spacing.three,
    ...Typography.bodyStrong,
    textAlign: "center",
  },
  userBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  userBadgeText: {
    ...Typography.caption,
    fontWeight: "700",
  },
  content: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    zIndex: 10,
  },
  drawerHeader: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
  },
  drawerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  drawerLogoFrame: {
    width: 56,
    height: 56,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.three,
    borderRadius: Radii.large,
    borderWidth: 1,
  },
  drawerLogo: {
    width: 56,
    height: 50,
  },
  drawerBrandCopy: {
    flex: 1,
  },
  drawerTagline: {
    marginTop: Spacing.one,
    ...Typography.caption,
    fontWeight: "800",
  },
  drawerBrand: {
    ...Typography.h2,
  },
  drawerProfile: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: Radii.medium,
  },
  drawerAvatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.two,
    borderRadius: Radii.pill,
  },
  drawerAvatarText: {
    ...Typography.caption,
    fontWeight: "800",
  },
  drawerProfileCopy: {
    flex: 1,
  },
  drawerUserName: {
    ...Typography.caption,
    fontWeight: "700",
  },
  drawerUserMeta: {
    ...Typography.caption,
    marginTop: Spacing.one,
  },
  drawerBody: {
    flex: 1,
  },
  drawerBodyContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  sectionContainer: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  menuItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.one,
    borderWidth: 1,
  },
  activeIndicator: { width: 3, alignSelf: "stretch", borderRadius: Radii.pill, marginRight: Spacing.two },
  menuItemPressed: { opacity: 0.76 },
  menuItemText: {
    flex: 1,
    marginLeft: Spacing.three,
    ...Typography.caption,
    fontWeight: "600",
  },
  logoutContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    borderTopWidth: 1,
  },
});
