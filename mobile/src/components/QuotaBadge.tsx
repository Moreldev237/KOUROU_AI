import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useGetMyQuotaQuery } from "@/store/api/quotasApi";
import { colors, radii, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

export function QuotaBadge() {
  const { data: quota } = useGetMyQuotaQuery();
  const { t } = useLanguage();

  if (!quota) return null;

  if (quota.is_unlimited) {
    return (
      <View style={[styles.badge, styles.unlimited]}>
        <Ionicons name="infinite" size={14} color={colors.white} />
        <Text style={styles.unlimitedText}>{t("Illimité")}</Text>
      </View>
    );
  }

  const isLow = (quota.remaining ?? 0) <= 2;
  const isExhausted = quota.remaining === 0;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, isLow ? styles.low : styles.normal]}>
        <Ionicons name="flash" size={14} color={isLow ? colors.error : colors.primary} />
        <Text style={[styles.text, isLow && styles.lowText]}>
          {quota.remaining} / {quota.daily_limit} {t("today")}
        </Text>
      </View>

      {isLow ? (
        <Pressable style={styles.upgradeButton} onPress={() => router.push("/(tabs)/subscription") }>
          <Text style={styles.upgradeButtonText}>{t(isExhausted ? "Passer Premium" : "Voir les offres")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  normal: { backgroundColor: `${colors.primary}1A` },
  low: { backgroundColor: `${colors.error}1A` },
  unlimited: { backgroundColor: colors.accentGreen },
  text: { ...typography.captionMedium, color: colors.primary, flexShrink: 1 },
  lowText: { color: colors.error },
  unlimitedText: { ...typography.captionMedium, color: colors.white },
  upgradeButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  upgradeButtonText: {
    ...typography.captionMedium,
    color: colors.white,
    flexShrink: 1,
  },
});
