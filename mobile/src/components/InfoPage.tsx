import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme";

interface InfoPageProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}

export function InfoPage({ title, icon, children }: InfoPageProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.huge }}
    >
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={25} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </ScrollView>
  );
}

export function InfoSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function InfoHero({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.heroEyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroText}>{children}</Text>
    </View>
  );
}

export function InfoMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function InfoText({ children }: { children: ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}

export function InfoCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  backButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", minHeight: 42, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, marginBottom: spacing.xxl },
  backButtonPressed: { opacity: 0.7, backgroundColor: colors.primarySoft },
  backText: { ...typography.bodyMedium, color: colors.primary },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xxl },
  iconWrap: { width: 50, height: 50, borderRadius: radii.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  title: { ...typography.h1, color: colors.textPrimary, flex: 1 },
  hero: { backgroundColor: colors.primaryDark, borderRadius: radii.xl, padding: spacing.xl, marginBottom: spacing.xxl, overflow: "hidden" },
  heroEyebrow: { ...typography.tiny, color: colors.accentSky, letterSpacing: 1.2, marginBottom: spacing.sm },
  heroTitle: { ...typography.h2, color: colors.white, marginBottom: spacing.sm },
  heroText: { ...typography.body, color: "rgba(255,255,255,0.82)", lineHeight: 23 },
  section: { marginBottom: spacing.xxl },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  text: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
  cardTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  contact: { ...typography.bodyMedium, color: colors.primary, marginTop: spacing.sm },
  contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 42, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
  faqCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  faqQuestion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  faqTitle: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  metric: { flex: 1, backgroundColor: colors.primarySoft, borderRadius: radii.md, padding: spacing.md },
  metricValue: { ...typography.h2, color: colors.primaryDark },
  metricLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: spacing.xs },
  actionButton: { alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  actionText: { ...typography.bodyMedium, color: colors.white },
  secondaryActionButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.sm },
  secondaryActionText: { ...typography.bodyMedium, color: colors.primary },
});

export const infoStyles = styles;
