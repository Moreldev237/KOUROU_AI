import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuotaBadge } from "@/components/QuotaBadge";
import { useGetMeQuery } from "@/store/api/authApi";
import { useGetQCMHistoryQuery } from "@/store/api/aiEngineApi";
import { colors, radii, spacing, typography } from "@/theme";
import type { QCMSessionListItem } from "@/types";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
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
  const inProgressCount = history?.results.filter((session) => !session.completed_at).length ?? 0;

  const getConsecutiveDays = (sessions: QCMSessionListItem[]) => {
    const uniqueDays = Array.from(
      new Set(
        sessions
          .map((session) => {
            if (!session.started_at) return null;
            const date = new Date(session.started_at);
            date.setHours(0, 0, 0, 0);
            return date.toISOString();
          })
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => b.localeCompare(a));

    if (uniqueDays.length === 0) {
      return 0;
    }

    let streak = 0;
    let expected = new Date(uniqueDays[0]);
    expected.setHours(0, 0, 0, 0);

    for (const isoDate of uniqueDays) {
      const date = new Date(isoDate);
      date.setHours(0, 0, 0, 0);
      if (date.getTime() === expected.getTime()) {
        streak += 1;
        expected.setDate(expected.getDate() - 1);
      } else if (date.getTime() < expected.getTime()) {
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Bonjour {firstName} 👋</Text>
          <Text style={styles.subGreeting}>
            {user?.target_exam_name ? `Objectif : ${user.target_exam_name}` : "Choisissez votre concours cible"}
          </Text>
       
        </View>
        <QuotaBadge />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="albums"
          label="Sessions"
          value={String(history?.results?.length ?? 0)}
          backgroundColor={`${colors.accentSky}1A`}
          iconColor={colors.accentSky}
          textColor={colors.primaryDark}
        />
        <StatCard
          icon="trophy"
          label="Score moyen"
          value={averageScore !== null ? `${averageScore}%` : "—"}
          backgroundColor={`${colors.primary}1A`}
          iconColor={colors.primary}
          textColor={colors.primaryDark}
        />
        <StatCard
          icon="bar-chart"
          label="Quotient de réussite"
          value={successRatio !== null ? `${successRatio}%` : "—"}
          backgroundColor={`${colors.accentGreen}1A`}
          iconColor={colors.accentGreen}
          textColor={colors.primaryDark}
        />
        <StatCard
          icon="timer"
          label="Séries en cours"
          value={String(inProgressCount)}
          backgroundColor={`${colors.warning}1A`}
          iconColor={colors.warning}
          textColor={colors.primaryDark}
        />
        <StatCard
          icon="flame"
          label="Jours consécutifs"
          value={`${streakDays} jour${streakDays === 1 ? "" : "s"}`}
          backgroundColor={`${colors.accentSky}1A`}
          iconColor={colors.accentSky}
          textColor={colors.primaryDark}
        />
      </View>

      <View style={styles.actionsGrid}>
        <ActionCard
          icon="school"
          title="S'entraîner"
          subtitle="Questions proches du format concours"
          color={colors.primary}
          onPress={() => router.push("/(tabs)/practice")}
        />
        <ActionCard
          icon="chatbubbles"
          title="Kourou IA"
          subtitle="Posez une question de cours"
          color={colors.accentGreen}
          onPress={() => router.push("/(tabs)/tutor")}
        />
      </View>

      <Text style={styles.sectionTitle}>Sessions récentes</Text>
      {recentSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Aucune session pour l&apos;instant. Lancez votre premier entraînement !</Text>
        </View>
      ) : (
        recentSessions.map((session) => (
          <View key={session.id} style={styles.sessionRow}>
            <View style={styles.sessionRowLeft}>
              <Text style={styles.sessionSubject}>{session.subject_name}</Text>
              <Text style={styles.sessionMeta}>
                {session.exam_name} · {session.question_count} questions
              </Text>
            </View>
            {session.score_percent !== null ? (
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{session.score_percent}%</Text>
              </View>
            ) : (
              <Text style={styles.pendingText}>En cours</Text>
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
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionCard, { backgroundColor: color }]}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.xl },
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
  emptyState: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { ...typography.body, color: colors.textTertiary, textAlign: "center" },
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
