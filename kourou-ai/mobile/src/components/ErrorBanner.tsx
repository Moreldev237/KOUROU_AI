import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, radii, spacing, typography } from "@/theme";

interface ErrorBannerProps {
  error: unknown;
}

/** Extrait un message lisible depuis une erreur RTK Query, quel que soit son format. */
export function extractErrorMessage(error: unknown): string {
  if (!error) return "";
  const err = error as any;

  if (err.status === "FETCH_ERROR" || err.status === "TIMEOUT_ERROR") {
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  }

  const data = err.data;

  if (data?.error?.message && typeof data.error.message === "string") {
    return data.error.message;
  }

  if (data?.error?.details?.non_field_errors?.[0] && typeof data.error.details.non_field_errors[0] === "string") {
    return data.error.details.non_field_errors[0];
  }

  if (data?.detail && typeof data.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const value = data[firstKey];
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }

  if (err.status === 400) {
    return "Identifiants invalides. Vérifiez votre adresse e-mail et votre mot de passe.";
  }

  if (err.status === 401) {
    return "Identifiants invalides. Vérifiez votre adresse e-mail et votre mot de passe.";
  }

  if (err.status === 403) {
    return "Accès refusé. Veuillez vérifier vos droits d’accès.";
  }

  return "Une erreur inattendue est survenue. Réessayez.";
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  const message = extractErrorMessage(error);
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={18} color={colors.error} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: `${colors.error}14`,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  text: { ...typography.body, color: colors.error, flex: 1 },
});
