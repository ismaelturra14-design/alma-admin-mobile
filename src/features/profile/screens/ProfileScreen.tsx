import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL } from '@/config/privacy';
import { useAuth } from '@/features/auth/context/AuthContext';
import { colors } from '@/theme/colors';
import { openExternalLink } from '@/utils/openExternalLink';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const fullName =
    [user?.user_fname, user?.user_lname].filter(Boolean).join(' ') ||
    'Usuario';
  const initials =
    [user?.user_fname, user?.user_lname]
      .map((name) => name?.trim().charAt(0))
      .filter(Boolean)
      .join('')
      .toUpperCase() || 'U';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Mi perfil</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.eyebrow}>CUENTA</Text>
            <Text style={styles.name} numberOfLines={2}>
              {fullName}
            </Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={styles.roleText} numberOfLines={1}>
                {user?.user_group_name || 'Usuario'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la cuenta</Text>
          <View style={styles.card}>
            <ProfileInfoRow
              icon="mail-outline"
              label="Correo electrónico"
              value={user?.user_email || 'No disponible'}
            />
            <View style={styles.divider} />
            <ProfileInfoRow
              icon="card-outline"
              label="RUT"
              value={user?.user_rut || 'No disponible'}
            />
            <View style={styles.divider} />
            <ProfileInfoRow
              icon="people-outline"
              label="Grupo de usuario"
              value={user?.user_group_name || 'No disponible'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad y cuenta</Text>
          <View style={styles.card}>
            <ProfileAction
              icon="lock-closed-outline"
              label="Política de privacidad"
              onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
            />
            <View style={styles.divider} />
            <ProfileAction
              icon="person-remove-outline"
              label="Solicitar eliminación de cuenta y datos"
              onPress={() => void openExternalLink(ACCOUNT_DELETION_URL)}
              destructive
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          onPress={() => void handleLogout()}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>
            Cerrar sesión
          </Text>
          <View style={styles.actionSpacer} />
          <Ionicons name="chevron-forward" size={18} color={colors.error} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type ProfileInfoRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

function ProfileInfoRow({ icon, label, value }: ProfileInfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

type ProfileActionProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

function ProfileAction({
  icon,
  label,
  onPress,
  destructive = false,
}: ProfileActionProps) {
  const foreground = destructive ? colors.error : colors.text;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <View style={[styles.rowIcon, destructive && styles.destructiveIcon]}>
        <Ionicons name={icon} size={18} color={foreground} />
      </View>
      <Text style={[styles.actionText, destructive && styles.destructiveText]}>
        {label}
      </Text>
      <View style={styles.actionSpacer} />
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 24,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: colors.text,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topBarSpacer: {
    width: 44,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  identityCopy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    marginTop: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  roleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
    backgroundColor: colors.border,
  },
  action: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveIcon: {
    backgroundColor: '#FEF2F2',
  },
  destructiveText: {
    color: colors.error,
  },
  actionSpacer: {
    flex: 1,
  },
  logoutButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
