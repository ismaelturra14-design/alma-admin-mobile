import {
    Pressable,
    StyleSheet,
    Text,
    type PressableProps,
    type PressableStateCallbackType,
} from 'react-native';

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
      variant === 'danger' ? styles.danger : styles.primary,
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
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
