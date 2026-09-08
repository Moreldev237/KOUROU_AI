import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuotaBadge } from "@/components/QuotaBadge";
import { BrandMark } from "@/components/BrandMark";
import { useLanguage } from "@/i18n";
import { useGetMeQuery } from "@/store/api/authApi";
import { useGetQCMHistoryQuery } from "@/store/api/aiEngineApi";
import { colors, radii, spacing, typography } from "@/theme";
import type { QCMSessionListItem } from "@/types";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { data: user, refetch: refetchMe, isFetching: isFetchingMe } = useGetMeQuery();
  const { data: history, refetch: refetchHistory } = useGetQCMHistoryQuery();

  const recentSessions = history?.results?.slice(0, 5) ?? [];
  const completed = history?.results?.filter((s) => s.completed_at) ?? [];
  const averageScore = completed.length
    ? Math.round(completed.reduce((sum, s) => sum + (s.score_percent ?? 0), 0) / completed.length)
    : null;

  const completedCount = completed.length;
  const successRatio = completedCount
    ? Math.round(
        (completed.filter((session) => (session.score_percent ?? 0) >= 50).length / completedCount) * 100
      )
    : null;
  const getConsecutiveDays = (sessions: QCMSessionListItem[]) => {
    // Use the device's local calendar day, then compare day numbers that are
    // independent of daylight-saving changes and timezone offsets.
    const uniqueDays = Array.from(
      new Set(
        sessions
          .map((session) => {
            if (!session.started_at) return null;
            const date = new Date(session.started_at);
            return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
          })
          .filter((day): day is number => day !== null)
      )
    ).sort((a, b) => b - a);

    if (uniqueDays.length === 0) {
      return 0;
    }

    let streak = 0;
    let expected = uniqueDays[0];

    for (const day of uniqueDays) {
      if (day === expected) {
        streak += 1;
        expected -= 1;
      } else if (day < expected) {
        break;
      }
    }

    return streak;
  };

  const streakDays = getConsecutiveDays(history?.results ?? []);
  const firstName = user?.full_name?.split(" ")[0] || "Candidat";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.huge }}
      refreshControl={
        <RefreshControl refreshing={isFetchingMe} onRefresh={() => { refetchMe(); refetchHistory(); }} />
      }
    >
      <BrandMark />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{t("greeting")} {firstName} 👋</Text>
          <Text style={styles.subGreeting}>
            {user?.target_exam_name ? `${t("objective")} : ${user.target_exam_name}` : t("chooseExam")}
          </Text>
       
        </View>
        <QuotaBadge />
      </View>

      <Pressable style={styles.guideLink} onPress={() => router.push("/guide")}>
        <View style={styles.guideIcon}>
          <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.guideCopy}>
          <Text style={styles.guideTitle}>{t("getStarted")}</Text>
          <Text style={styles.guideText}>{t("getStartedText")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={colors.primary} />
      </Pressable>

      <View style={styles.statsRow}>
        <StatCard
          icon="albums"
          label={t("sessions")}
          value={String(history?.results?.length ?? 0)}
          backgroundColor={`${colors.accentSky}1A`}
          iconColor={colors.accentSky}
          textColor={colors.primaryDark}
        />
        <StatCard
          icon="trophy"
          label={t("averageScore")}
          value={averageScore !== null ? `${averageScore}%` : "—"}
          backgroundColor={`${colors.primary}1A`}
          iconColor={colors.primary}
          textColor={colors.primaryDark}
        />
        <StatCard
          icon="bar-chart"
          label={t("successRate")}
          value={successRatio !== null ? `${successRatio}%` : "—"}
          backgroundColor={`${colors.accentGreen}1A`}
          iconColor={colors.accentGreen}
          textColor={colors.primaryDark}
        />
        <StatCard
          icon="flame"
          label={t("consecutiveDays")}
          value={`${streakDays} jour${streakDays === 1 ? "" : "s"}`}
          backgroundColor={`${colors.accentSky}1A`}
          iconColor={colors.accentSky}
          textColor={colors.primaryDark}
        />
      </View>

      <View style={styles.actionsGrid}>
        <ActionCard
          icon="school"
          title={t("train")}
          subtitle={t("trainSubtitle")}
          color={colors.primary}
          featured
          onPress={() => router.push("/(tabs)/practice")}
        />
        <ActionCard
          icon="chatbubbles"
          title={t("tutor")}
          subtitle={t("tutorSubtitle")}
          color={colors.accentGreen}
          onPress={() => router.push("/(tabs)/tutor")}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("recentSessions")}</Text>
        <Pressable onPress={() => router.push("/(tabs)/history")}>
          <Text style={styles.historyLink}>{t("seeAll")}</Text>
        </Pressable>
      </View>
      {recentSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="rocket-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t("Prêt à commencer ?")}</Text>
          <Text style={styles.emptyText}>{t("noSessions")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Commencer mon premier entraînement")}
            style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
            onPress={() => router.push("/(tabs)/practice")}
          >
            <Text style={styles.emptyButtonText}>{t("Commencer mon premier entraînement")}</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        recentSessions.map((session) => (
          <View key={session.id} style={styles.sessionRow}>
            <View style={styles.sessionRowLeft}>
              <Text style={styles.sessionSubject}>{session.subject_name}</Text>
              <Text style={styles.sessionMeta}>
                {session.exam_name} · {session.subject_name} · {session.question_count} {t("questions")}
              </Text>
              <Text style={styles.sessionProgram}>
                {session.topic_name ? `${t("revisedSubject")} · ${session.topic_name}` : `${t("revisedSubject")} · ${t("fullSubject")}`}
              </Text>
            </View>
            {session.score_percent !== null ? (
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{session.score_percent}%</Text>
              </View>
            ) : (
              <Text style={styles.pendingText}>{t("unfinished")}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  backgroundColor,
  iconColor,
  textColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  backgroundColor?: string;
  iconColor?: string;
  textColor?: string;
}) {
  return (
    <View style={[styles.statCard, backgroundColor ? { backgroundColor } : null]}>
      <View style={[styles.statIconWrap, iconColor ? { backgroundColor: `${iconColor}1A` } : null]}>
        <Ionicons name={icon} size={18} color={iconColor || colors.primary} />
      </View>
      <Text style={[styles.statValue, textColor ? { color: textColor } : null]}>{value}</Text>
      <Text style={[styles.statLabel, textColor ? { color: textColor } : null]}>{label}</Text>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  color,
  featured = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  featured?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, featured && styles.featuredActionCard, { backgroundColor: color }, pressed && styles.actionCardPressed]}
    >
      <View style={[styles.actionIconWrap, featured && styles.featuredActionIconWrap]}>
        <Ionicons name={icon} size={featured ? 27 : 22} color={colors.white} />
      </View>
      <Text style={[styles.actionTitle, featured && styles.featuredActionTitle]}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.xl },
  guideLink: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xl },
  guideIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: `${colors.accentSky}1A`, alignItems: "center", justifyContent: "center" },
  guideCopy: { flex: 1 },
  guideTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  guideText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  headerContent: { flex: 1, minWidth: 0 },
  greeting: { ...typography.h1, color: colors.textPrimary, flexShrink: 1 },
  subGreeting: { ...typography.body, color: colors.textSecondary, marginTop: 2, flexShrink: 1 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl, justifyContent: "space-between" },
  statCard: {
    flexBasis: "48%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 108,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: "rgba(35, 90, 164, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { ...typography.h2, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xxl },
  actionCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 130,
  },
  featuredActionCard: { flexBasis: "100%", minHeight: 158, padding: spacing.xl },
  featuredActionIconWrap: { width: 48, height: 48 },
  featuredActionTitle: { ...typography.h2, marginTop: spacing.lg },
  actionCardPressed: { opacity: 0.82 },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { ...typography.h3, color: colors.white, marginTop: spacing.md },
  actionSubtitle: { ...typography.caption, color: "rgba(255,255,255,0.85)", flexShrink: 1 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyLink: { ...typography.captionMedium, color: colors.primary, marginBottom: spacing.md },
  emptyState: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.xl },
  emptyIconWrap: { width: 56, height: 56, borderRadius: radii.full, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, textAlign: "center" },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs },
  emptyButton: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  emptyButtonText: { ...typography.bodyMedium, color: colors.white },
  emptyButtonPressed: { opacity: 0.75 },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  sessionRowLeft: { flex: 1 },
  sessionSubject: { ...typography.bodyMedium, color: colors.textPrimary },
  sessionMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sessionProgram: { ...typography.tiny, color: colors.primary, marginTop: spacing.xs },
  scorePill: { backgroundColor: `${colors.accentGreen}1A`, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  scoreText: { ...typography.captionMedium, color: colors.accentGreen },
  pendingText: { ...typography.caption, color: colors.warning },
  upgradeButton: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.accentGreen,
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  upgradeButtonText: {
    ...typography.captionMedium,
    color: colors.white,
  },
});
