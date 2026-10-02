import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

const ACTIONS = {
  add: { icon: 'add-outline', label: 'Agregar', semantic: 'primary', variant: 'filled', hint: 'Inicia la creación de un registro.' },
  edit: { icon: 'create-outline', label: 'Editar', semantic: 'primary', variant: 'outlined', hint: 'Abre el formulario de edición.' },
  detail: { icon: 'eye-outline', label: 'Ver detalle', semantic: 'info', variant: 'outlined', hint: 'Abre los detalles del elemento.' },
  save: { icon: 'checkmark-outline', label: 'Guardar cambios', semantic: 'primary', variant: 'filled', hint: 'Guarda los cambios realizados.' },
  cancel: { icon: 'close-outline', label: 'Cancelar', semantic: 'neutral', variant: 'outlined', hint: 'Descarta la acción actual.' },
  search: { icon: 'search-outline', label: 'Buscar', semantic: 'neutral', variant: 'outlined', hint: 'Busca elementos en la lista.' },
  filter: { icon: 'options-outline', label: 'Filtrar', semantic: 'neutral', variant: 'outlined', hint: 'Muestra opciones de filtro.' },
  logout: { icon: 'log-out-outline', label: 'Cerrar sesión', semantic: 'danger', variant: 'outlined', hint: 'Cierra tu sesión actual.' },
} as const;

export type ActionName = keyof typeof ACTIONS;

type ActionButtonProps = Omit<PressableProps, 'children'> & {
  action: ActionName;
  label?: string;
  fullWidth?: boolean;
};

export function ActionButton({ action, label, fullWidth = false, style, ...props }: ActionButtonProps) {
  const { colors } = useAppTheme();
  const config = ACTIONS[action];
  const foreground = config.semantic === 'danger' ? colors.error : config.semantic === 'info' ? colors.info : config.semantic === 'neutral' ? colors.text : colors.primary;
  const background = config.variant === 'filled' ? foreground : 'transparent';
  const textColor = config.variant === 'filled' ? colors.surface : foreground;
  const title = label ?? config.label;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={config.hint}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: foreground },
        fullWidth && styles.fullWidth,
        props.disabled && styles.disabled,
        pressed && !props.disabled && styles.pressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      <Ionicons name={config.icon} size={18} color={textColor} accessibilityLabel={title} accessibilityHint={config.hint} />
      <Text style={[styles.label, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

export { ACTIONS };

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radii.medium,
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.48 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  label: { ...Typography.bodyStrong },
});