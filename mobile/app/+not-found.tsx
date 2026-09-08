import { StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";

import { colors, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

export default function NotFoundScreen() {
  const { t } = useLanguage();
  return (
    <>
      <Stack.Screen options={{ title: t("Page introuvable") }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t("Cette page n'existe pas.")}</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>{t("Retour à l'accueil")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, backgroundColor: colors.background },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
  link: { paddingVertical: spacing.md },
  linkText: { ...typography.bodyMedium, color: colors.primary },
});
