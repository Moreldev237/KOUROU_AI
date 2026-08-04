import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useGetMyQuotaQuery } from "@/store/api/quotasApi";
import { colors, radii, spacing, typography } from "@/theme";

export function QuotaBadge() {
  const { data: quota } = useGetMyQuotaQuery();

  if (!quota) return null;

  if (quota.is_unlimited) {
    return (
      <View style={[styles.badge, styles.unlimited]}>
        <Ionicons name="infinite" size={14} color={colors.white} />
        <Text style={styles.unlimitedText}>Illimité</Text>
      </View>
    );
  }

  const isLow = (quota.remaining ?? 0) <= 2;

  return (
    <View style={[styles.badge, isLow ? styles.low : styles.normal]}>
      <Ionicons name="flash" size={14} color={isLow ? colors.error : colors.primary} />
      <Text style={[styles.text, isLow && styles.lowText]}>
        {quota.remaining} / {quota.daily_limit} aujourd&apos;hui
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  normal: { backgroundColor: `${colors.primary}1A` },
  low: { backgroundColor: `${colors.error}1A` },
  unlimited: { backgroundColor: colors.accentGreen },
  text: { ...typography.captionMedium, color: colors.primary },
  lowText: { color: colors.error },
  unlimitedText: { ...typography.captionMedium, color: colors.white },
});
