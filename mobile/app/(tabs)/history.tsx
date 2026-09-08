import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeleteQCMSessionMutation, useGetQCMHistoryQuery } from "@/store/api/aiEngineApi";
import { colors, radii, spacing, typography } from "@/theme";
import type { Difficulty, QCMSessionListItem } from "@/types";
import { useLanguage } from "@/i18n";

type StatusFilter = "all" | "completed" | "pending";
type DifficultyFilter = "all" | Difficulty;

const difficulties: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "Tous les niveaux" },
  { value: "facile", label: "Facile" },
  { value: "moyen", label: "Moyen" },
  { value: "difficile", label: "Difficile" },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useGetQCMHistoryQuery();
  const [deleteSession, { isLoading: isDeleting }] = useDeleteQCMSessionMutation();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [exam, setExam] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useLanguage();
  const sessions = useMemo(() => data?.results ?? [], [data?.results]);

  const exams = Array.from(new Set(sessions.map((session) => session.exam_name)));
  const filteredSessions = useMemo(
    () => sessions.filter((session) => {
      const statusMatches = status === "all" || (status === "completed" ? Boolean(session.completed_at) : !session.completed_at);
      const difficultyMatches = difficulty === "all" || session.difficulty === difficulty;
      const examMatches = exam === "all" || session.exam_name === exam;
      return statusMatches && difficultyMatches && examMatches;
    }),
    [difficulty, exam, sessions, status]
  );
  const activeFilterCount = [status !== "all", difficulty !== "all", exam !== "all"].filter(Boolean).length;

  const resetFilters = () => {
    setStatus("all");
    setDifficulty("all");
    setExam("all");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.huge }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("Retour")}>
          <Text style={styles.backLabel}>{t("Retour")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("Historique des QCM")}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Ouvrir les filtres")}
        style={({ pressed }) => [styles.filtersButton, pressed && styles.filtersButtonPressed]}
        onPress={() => setShowFilters(true)}
      >
        <Ionicons name="options-outline" size={19} color={colors.primary} />
        <Text style={styles.filtersButtonText}>{t("Filtres")}</Text>
        {activeFilterCount > 0 ? <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View> : null}
        <Ionicons name="chevron-down" size={18} color={colors.primary} />
      </Pressable>

      <Text style={styles.resultCount}>{filteredSessions.length} {t("session(s)")}</Text>
      {filteredSessions.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>{t("Aucune session ne correspond à ces filtres.")}</Text></View>
      ) : (
        filteredSessions.map((session) => <SessionRow key={session.id} session={session} onDelete={() => {
          Alert.alert(
            t("Supprimer cette session ?"),
            t("Cette action supprimera la session et ses corrections."),
            [
              { text: t("Annuler"), style: "cancel" },
              { text: t("Supprimer"), style: "destructive", onPress: () => deleteSession(session.id) },
            ],
          );
        }} disabled={isDeleting} />)
      )}

      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.filterOverlay}>
          <View style={styles.filterPanel}>
            <View style={styles.filterPanelHeader}>
              <Text style={styles.filterPanelTitle}>{t("Filtrer l'historique")}</Text>
              <Pressable onPress={() => setShowFilters(false)} accessibilityRole="button" accessibilityLabel={t("Fermer")}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>{t("État")}</Text>
              <View style={styles.filterRow}>
                {([["all", "Toutes"], ["completed", "Terminées"], ["pending", "Non terminées"]] as const).map(([value, label]) => (
                  <FilterChip key={value} label={t(label)} active={status === value} onPress={() => setStatus(value)} />
                ))}
              </View>
              <Text style={styles.sectionLabel}>{t("Niveau")}</Text>
              <View style={styles.filterRow}>
                {difficulties.map((item) => <FilterChip key={item.value} label={t(item.label)} active={difficulty === item.value} onPress={() => setDifficulty(item.value)} />)}
              </View>
              <Text style={styles.sectionLabel}>{t("Concours")}</Text>
              <View style={styles.filterRow}>
                <FilterChip label={t("Tous les concours")} active={exam === "all"} onPress={() => setExam("all")} />
                {exams.map((item) => <FilterChip key={item} label={item} active={exam === item} onPress={() => setExam(item)} />)}
              </View>
            </ScrollView>
            <View style={styles.filterPanelActions}>
              <Pressable style={styles.resetButton} onPress={resetFilters}><Text style={styles.resetButtonText}>{t("Réinitialiser")}</Text></Pressable>
              <Pressable style={styles.applyButton} onPress={() => setShowFilters(false)}><Text style={styles.applyButtonText}>{t("Appliquer")}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SessionRow({ session, onDelete, disabled }: { session: QCMSessionListItem; onDelete: () => void; disabled: boolean }) {
  const { t } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.subject_name} ${session.score_percent === null ? t("Non terminé") : `${session.score_percent}%`}`}
      style={({ pressed }) => [styles.sessionRow, pressed && styles.sessionRowPressed]}
      onPress={() => router.push({ pathname: "/qcm/[id]", params: { id: session.id } })}
    >
      <View style={styles.sessionCopy}>
        <Text style={styles.sessionSubject}>{session.subject_name}</Text>
        <Text style={styles.sessionMeta}>{session.exam_name} · {session.question_count} {t("questions")} · {session.difficulty}</Text>
      </View>
      <Text style={session.score_percent === null ? styles.pending : styles.score}>
        {session.score_percent === null ? t("Non terminé") : `${session.score_percent}%`}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Supprimer")}
        disabled={disabled}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed, disabled && styles.deleteButtonDisabled]}
        onPress={(event) => { event.stopPropagation(); onDelete(); }}
      >
        <Ionicons name="trash-outline" size={19} color={colors.error} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.xl },
  backLabel: { ...typography.bodyMedium, color: colors.primary },
  title: { ...typography.h1, color: colors.textPrimary, flexShrink: 1 },
  sectionLabel: { ...typography.captionMedium, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  horizontalFilters: { gap: spacing.sm, paddingBottom: spacing.xs },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterLabel: { ...typography.caption, color: colors.textSecondary },
  filterLabelActive: { color: colors.white },
  resultCount: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  sessionRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md },
  sessionRowPressed: { opacity: 0.72 },
  filtersButton: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  filtersButtonPressed: { opacity: 0.72 },
  filtersButtonText: { ...typography.bodyMedium, color: colors.primary, flex: 1 },
  filterCount: { minWidth: 24, height: 24, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  filterCountText: { ...typography.tiny, color: colors.white },
  filterOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  filterPanel: { maxHeight: "86%", backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl },
  filterPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  filterPanelTitle: { ...typography.h2, color: colors.textPrimary },
  filterPanelActions: { flexDirection: "row", gap: spacing.sm, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.lg },
  resetButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  resetButtonText: { ...typography.bodyMedium, color: colors.textSecondary },
  applyButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primary },
  applyButtonText: { ...typography.bodyMedium, color: colors.white },
  deleteButton: { width: 38, height: 38, borderRadius: radii.full, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.error}12`, marginLeft: spacing.xs },
  deleteButtonPressed: { opacity: 0.65 },
  deleteButtonDisabled: { opacity: 0.35 },
  sessionCopy: { flex: 1 },
  sessionSubject: { ...typography.bodyMedium, color: colors.textPrimary },
  sessionMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  score: { ...typography.bodyMedium, color: colors.accentGreen },
  pending: { ...typography.captionMedium, color: colors.warning },
  emptyState: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.xl, marginTop: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
});
