import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ErrorBanner } from "@/components/ErrorBanner";
import { QuotaBadge } from "@/components/QuotaBadge";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useGetExamQuery, useListExamsQuery } from "@/store/api/examsApi";
import { useGenerateQCMMutation } from "@/store/api/aiEngineApi";
import { colors, difficultyColors, radii, spacing, typography } from "@/theme";
import type { Difficulty, SubjectLight } from "@/types";

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "facile", label: "Facile" },
  { key: "moyen", label: "Moyen" },
  { key: "difficile", label: "Difficile" },
];

export default function PracticeScreen() {
  const { data: exams, isLoading: loadingExams } = useListExamsQuery();
  const [selectedExamCode, setSelectedExamCode] = useState<string | null>(null);
  const { data: examDetail, isFetching: loadingDetail } = useGetExamQuery(selectedExamCode ?? "", {
    skip: !selectedExamCode,
  });
  const [selectedSubject, setSelectedSubject] = useState<SubjectLight | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("moyen");
  const [generateQCM, { isLoading: isGenerating, error }] = useGenerateQCMMutation();

  const handleStart = async () => {
    if (!examDetail || !selectedSubject) return;
    try {
      const session = await generateQCM({
        exam: examDetail.id,
        subject: selectedSubject.id,
        mode: "qcm_batch",
        difficulty,
        question_count: 5,
      }).unwrap();
      router.push({ pathname: "/qcm/[id]", params: { id: session.id } });
    } catch {
      // erreur affichée via ErrorBanner
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Entraînement</Text>
        <QuotaBadge />
      </View>

      <ErrorBanner error={error} />

      <Text style={styles.sectionLabel}>1. Choisissez un concours</Text>
      {loadingExams ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={exams?.results ?? []}
          keyExtractor={(item) => item.code}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelectedExamCode(item.code);
                setSelectedSubject(null);
              }}
              style={[
                styles.examChip,
                selectedExamCode === item.code && { backgroundColor: item.color_hex || colors.primary },
              ]}
            >
              <Text style={styles.examChipEmoji}>{item.icon_emoji || "📘"}</Text>
              <Text style={[styles.examChipText, selectedExamCode === item.code && styles.examChipTextActive]}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      )}

      {selectedExamCode && (
        <>
          <Text style={styles.sectionLabel}>2. Choisissez une matière</Text>
          {loadingDetail ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <View style={styles.subjectsWrap}>
              {examDetail?.subjects.map((subject) => (
                <Pressable
                  key={subject.id}
                  onPress={() => setSelectedSubject(subject)}
                  style={[styles.subjectCard, selectedSubject?.id === subject.id && styles.subjectCardActive]}
                >
                  <Text
                    style={[styles.subjectName, selectedSubject?.id === subject.id && styles.subjectNameActive]}
                  >
                    {subject.name}
                  </Text>
                  <Text style={styles.subjectMeta}>{subject.topics_count} thèmes</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {selectedSubject && (
        <>
          <Text style={styles.sectionLabel}>3. Niveau de difficulté</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((d) => (
              <Pressable
                key={d.key}
                onPress={() => setDifficulty(d.key)}
                style={[
                  styles.difficultyChip,
                  difficulty === d.key && { backgroundColor: difficultyColors[d.key], borderColor: difficultyColors[d.key] },
                ]}
              >
                <Text style={[styles.difficultyText, difficulty === d.key && styles.difficultyTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.startButton} onPress={handleStart} disabled={isGenerating}>
            {isGenerating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.white} />
                <Text style={styles.startButtonText}>Générer mon QCM</Text>
              </>
            )}
          </Pressable>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary },
  sectionLabel: { ...typography.captionMedium, color: colors.textSecondary, marginBottom: spacing.md, marginTop: spacing.sm },
  examChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  examChipEmoji: { fontSize: 16 },
  examChipText: { ...typography.captionMedium, color: colors.textPrimary },
  examChipTextActive: { color: colors.white },
  subjectsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  subjectCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  subjectCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
  subjectName: { ...typography.bodyMedium, color: colors.textPrimary },
  subjectNameActive: { color: colors.primary },
  subjectMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  difficultyRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xxl },
  difficultyChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  difficultyText: { ...typography.captionMedium, color: colors.textSecondary },
  difficultyTextActive: { color: colors.white },
  startButton: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  startButtonText: { ...typography.bodyMedium, color: colors.white },
});
