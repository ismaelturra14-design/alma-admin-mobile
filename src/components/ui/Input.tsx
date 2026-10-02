import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type InputProps = TextInputProps & {
  label?: string;
};

export function Input({ label, style, ...props }: InputProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }, style]}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  label: {
    marginBottom: Spacing.two,
    ...Typography.caption,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.medium,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
