import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/context/AuthContext';
import { colors } from '@/theme/colors';

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Perfil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>{user?.user_fname} {user?.user_lname}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.user_email}</Text>

          <Text style={styles.label}>RUT</Text>
          <Text style={styles.value}>{user?.user_rut}</Text>

          <Text style={styles.label}>Grupo</Text>
          <Text style={styles.value}>{user?.user_group_name}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    marginTop: 4,
  },
});
