import {
    Pressable,
    StyleSheet,
    Text,
    type PressableProps,
    type PressableStateCallbackType,
} from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { colors } from '@/theme/colors';

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'danger';
};

export function Button({ title, variant = 'primary', style, ...props }: ButtonProps) {
  const resolveStyle = (state: PressableStateCallbackType) => {
    const resolvedStyle =
      typeof style === 'function' ? style(state) : style;

    return [
      styles.button,
      { backgroundColor: variant === 'danger' ? colors.error : colors.primary },
      state.pressed && styles.pressed,
      resolvedStyle,
    ];
  };

  return (
    <Pressable
      {...props}
      style={({ pressed }) => resolveStyle({ pressed })}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: Radii.medium,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: '#fff',
    ...Typography.bodyStrong,
  },
});
