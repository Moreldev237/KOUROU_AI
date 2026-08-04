import { StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";

import { colors, spacing, typography } from "@/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page introuvable" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Cette page n&apos;existe pas.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Retour à l&apos;accueil</Text>
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
