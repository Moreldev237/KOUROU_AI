import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, radii, spacing, typography } from "@/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = "primary", disabled, loading, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, textVariantStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.accentGreen },
  outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: "transparent" },
});

const textVariantStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.white },
  outline: { color: colors.primary },
  ghost: { color: colors.primary },
});
