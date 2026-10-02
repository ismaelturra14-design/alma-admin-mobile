import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function AccessDeniedScreen({
  description = 'Tu cuenta no tiene autorización para abrir este módulo.',
}: {
  description?: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={32} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.text }]}>Acceso denegado</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.two,
  },
  title: {
    ...Typography.h2,
    textAlign: 'center',
  },
  description: {
    ...Typography.body,
    textAlign: 'center',
  },
});