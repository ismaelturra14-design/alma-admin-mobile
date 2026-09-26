import { SafeAreaView, StyleSheet } from 'react-native';

import { LoginForm } from '@/components/auth/LoginForm';
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LoginForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
