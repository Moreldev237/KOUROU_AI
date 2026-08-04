import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuotaBadge } from "@/components/QuotaBadge";
import { useGetMeQuery } from "@/store/api/authApi";
import { useGetQCMHistoryQuery } from "@/store/api/aiEngineApi";
import { colors, radii, spacing, typography } from "@/theme";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { data: user, refetch: refetchMe, isFetching: isFetchingMe } = useGetMeQuery();
  const { data: history, refetch: refetchHistory } = useGetQCMHistoryQuery();

  const recentSessions = history?.results?.slice(0, 5) ?? [];
  const completed = history?.results?.filter((s) => s.completed_at) ?? [];
  const averageScore = completed.length
    ? Math.round(completed.reduce((sum, s) => sum + (s.score_percent ?? 0), 0) / completed.length)
    : null;

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
        <View>
          <Text style={styles.greeting}>Bonjour {firstName} 👋</Text>
          <Text style={styles.subGreeting}>
            {user?.target_exam_name ? `Objectif : ${user.target_exam_name}` : "Choisissez votre concours cible"}
          </Text>
        </View>
        <QuotaBadge />
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="albums" label="Sessions" value={String(history?.results?.length ?? 0)} />
        <StatCard icon="trophy" label="Score moyen" value={averageScore !== null ? `${averageScore}%` : "—"} />
      </View>

      <View style={styles.actionsGrid}>
        <ActionCard
          icon="school"
          title="S'entraîner"
          subtitle="Nouveau QCM généré par l'IA"
          color={colors.primary}
          onPress={() => router.push("/(tabs)/practice")}
        />
        <ActionCard
          icon="chatbubbles"
          title="Tuteur IA"
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

function StatCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xl },
  greeting: { ...typography.h1, color: colors.textPrimary },
  subGreeting: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xxl },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statValue: { ...typography.h2, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  actionsGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xxl },
  actionCard: {
    flex: 1,
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
  actionSubtitle: { ...typography.caption, color: "rgba(255,255,255,0.85)" },
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
});
