import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { getVisibleMenuSections } from '@/navigation/menuConfig';
import { ModulePlaceholderScreen } from '@/screens/modules/ModulePlaceholderScreen';
import { colors } from '@/theme/colors';

type ModuleScreen = {
  id: string;
  label: string;
  description: string;
};

const moduleScreens: Record<string, ModuleScreen> = {
  Inicio: { id: 'inicio', label: 'Inicio', description: 'Panel principal de Alma Admin Mobile.' },
  UsuariosDelSistema: {
    id: 'usuarios-del-sistema',
    label: 'Usuarios del Sistema',
    description: 'Administración de usuarios y accesos del sistema.',
  },
  Prestaciones: { id: 'prestaciones', label: 'Prestaciones', description: 'Módulo de prestaciones del sistema.' },
  AgrupacionEspecialidades: {
    id: 'agrupacion-especialidades',
    label: 'Agrupación Especialidades',
    description: 'Gestión de agrupación y clasificación de especialidades.',
  },
  VinculosEMR: { id: 'vinculos-emr', label: 'Vínculos EMR', description: 'Integración y administración de vínculos EMR.' },
  VinculosTMInformante: {
    id: 'vinculos-tm-informante',
    label: 'Vínculos TM-Informante',
    description: 'Gestión de vínculos con TM-Informante.',
  },
  Caja: { id: 'caja', label: 'Caja', description: 'Operaciones de caja y flujo de pagos.' },
  MantenedorGrupos: {
    id: 'mantenedor-grupos',
    label: 'Mantenedor Grupos',
    description: 'Mantenimiento de grupos y configuración de acceso.',
  },
  RolesPermisos: {
    id: 'roles-permisos',
    label: 'Roles y Permisos',
    description: 'Configuración de roles y permisos del sistema.',
  },
  AuditoriaPermisos: {
    id: 'auditoria-permisos',
    label: 'Auditoría de permisos',
    description: 'Consulta y revisión de cambios de permisos.',
  },
  BoxPantalla: { id: 'box-pantalla', label: 'Box Pantalla', description: 'Configuración y administración de pantallas.' },
  MantenedorPantallas: {
    id: 'mantenedor-pantallas',
    label: 'Mantenedor Pantallas',
    description: 'Mantenimiento del catálogo de pantallas del sistema.',
  },
  GestionTotem: {
    id: 'gestion-totem',
    label: 'Gestión Totem',
    description: 'Administración de totems y pantallas de información.',
  },
  Interfaces: { id: 'interfaces', label: 'Interfaces', description: 'Integración y mantenimiento de interfaces del sistema.' },
  Financiadores: { id: 'financiadores', label: 'Financiadores', description: 'Gestión de financiadores del sistema.' },
  TiposPago: { id: 'tipos-pago', label: 'Tipos de Pago', description: 'Administración de tipos de pago.' },
  MetodosPago: { id: 'metodos-pago', label: 'Métodos de Pago', description: 'Configuración de métodos de pago.' },
  RelacionPagos: {
    id: 'relacion-pagos',
    label: 'Relación de Pagos',
    description: 'Consulta y administración de relaciones de pagos.',
  },
};

export function AppDrawer() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreenId, setActiveScreenId] = useState('inicio');
  const translateX = useRef(new Animated.Value(-320)).current;

  const menuSections = useMemo(
    () => getVisibleMenuSections(user?.user_group_id ?? null),
    [user?.user_group_id]
  );

  const activeScreen = useMemo(() => {
    const selected = Object.values(moduleScreens).find((screen) => screen.id === activeScreenId);
    return selected ?? moduleScreens.Inicio;
  }, [activeScreenId]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -320,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateX]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.replace('/login');
  };

  const fullName = user ? `${user.user_fname} ${user.user_lname}`.trim() : 'Usuario';
  const groupName = user?.user_group_name ?? 'Sin grupo';
  const initials = (user ? `${user.user_fname} ${user.user_lname}` : 'US')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

  const handleSelectModule = (route: string) => {
    const nextScreen = moduleScreens[route as keyof typeof moduleScreens];
    if (nextScreen) {
      setActiveScreenId(nextScreen.id);
    }
    setIsOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.menuButton} onPress={() => setIsOpen((prev) => !prev)}>
            <Text style={styles.menuButtonText}>☰</Text>
          </Pressable>

          <Text style={styles.headerTitle}>{activeScreen.label}</Text>

          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <ModulePlaceholderScreen
            title={activeScreen.label}
            description={activeScreen.description}
          />
        </View>

        {isOpen ? <Pressable style={styles.overlay} onPress={() => setIsOpen(false)} /> : null}

        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[styles.drawer, { transform: [{ translateX }] }]}
        >
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerBrand}>Alma Admin</Text>
            <Text style={styles.drawerUserName}>{fullName}</Text>
            <Text style={styles.drawerUserMeta}>{groupName}</Text>
          </View>

          <ScrollView
            style={styles.drawerBody}
            contentContainerStyle={styles.drawerBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {menuSections.map((section) => (
              <View key={section.id} style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {section.items.map((item) => {
                  const isActive = activeScreenId === item.id || activeScreenId === item.route;

                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.menuItem,
                        isActive && styles.menuItemActive,
                        pressed && styles.menuItemPressed,
                      ]}
                      onPress={() => handleSelectModule(item.route)}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={isActive ? '#1d4ed8' : '#475569'}
                      />
                      <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.logoutContainer}>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef6ff',
  },
  menuButtonText: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    zIndex: 10,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  drawerBrand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  drawerUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  drawerUserMeta: {
    fontSize: 12,
    marginTop: 4,
    color: '#475569',
  },
  drawerBody: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  drawerBodyContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionContainer: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  menuItemActive: {
    backgroundColor: '#ecf5ff',
    borderColor: '#bfdbfe',
  },
  menuItemPressed: {
    backgroundColor: '#f1f5f9',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: '#1d4ed8',
  },
  logoutContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logoutText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
});
