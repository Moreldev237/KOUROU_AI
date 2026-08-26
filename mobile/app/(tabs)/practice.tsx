import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ErrorBanner } from "@/components/ErrorBanner";
import { QuotaBadge } from "@/components/QuotaBadge";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAppDispatch } from "@/store/hooks";
import { useUpdateMeMutation } from "@/store/api/authApi";
import { setUser } from "@/store/authSlice";
import { useGetMeQuery } from "@/store/api/authApi";
import { useGetExamQuery, useListExamsQuery } from "@/store/api/examsApi";
import { useGenerateQCMMutation } from "@/store/api/aiEngineApi";
import { colors, difficultyColors, radii, spacing, typography } from "@/theme";
import type { Difficulty, ExamListItem, SubjectLight } from "@/types";

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "facile", label: "Facile" },
  { key: "moyen", label: "Moyen" },
  { key: "difficile", label: "Difficile" },
];

export default function PracticeScreen() {
  const { data: user } = useGetMeQuery();
  const { data: exams, isLoading: loadingExams } = useListExamsQuery();
  const [updateMe] = useUpdateMeMutation();
  const dispatch = useAppDispatch();
  const [searchText, setSearchText] = useState("");
  const [selectedExamCode, setSelectedExamCode] = useState<string | null>(null);
  const clearingExamRef = useRef(false);
  const { data: examDetail, isFetching: loadingDetail } = useGetExamQuery(selectedExamCode ?? "", {
    skip: !selectedExamCode,
  });
  const [selectedSubject, setSelectedSubject] = useState<SubjectLight | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("moyen");
  const [generateQCM, { isLoading: isGenerating, error }] = useGenerateQCMMutation();

  useEffect(() => {
    if (clearingExamRef.current || !user?.target_exam || selectedExamCode || !exams?.results?.length) return;
    const targetExam = exams.results.find((exam) => exam.id === user.target_exam);
    if (targetExam) {
      setSelectedExamCode(targetExam.code);
      setSearchText(targetExam.name);
    }
  }, [user?.target_exam, exams?.results, selectedExamCode]);

  useEffect(() => {
    if (!selectedSubject && examDetail?.subjects?.length) {
      setSelectedSubject(examDetail.subjects[0]);
    }
  }, [examDetail?.subjects, selectedSubject]);

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

  const handleCancelSelection = async () => {
    if (!selectedExamCode && !searchText) return;
    clearingExamRef.current = true;
    setSelectedExamCode(null);
    setSelectedSubject(null);
    setSearchText("");
    try {
      const updated = await updateMe({ target_exam: null }).unwrap();
      dispatch(setUser(updated));
    } catch {
      // silent
    } finally {
      clearingExamRef.current = false;
    }
  };

  const handleExamPress = async (item: ExamListItem) => {
    if (selectedExamCode === item.code) {
      clearingExamRef.current = true;
      setSelectedExamCode(null);
      setSelectedSubject(null);
      setSearchText("");
      try {
        const updated = await updateMe({ target_exam: null }).unwrap();
        dispatch(setUser(updated));
      } catch {
        // silent
      } finally {
        clearingExamRef.current = false;
      }
      return;
    }

    setSelectedExamCode(item.code);
    setSelectedSubject(null);
    setSearchText(item.name);
    try {
      const updated = await updateMe({ target_exam: item.id }).unwrap();
      dispatch(setUser(updated));
    } catch {
      // silent
    }
  };

  const filteredExams = useMemo(
    () =>
      exams?.results.filter((exam) =>
        exam.name.toLowerCase().includes(searchText.toLowerCase()) ||
        exam.organizing_body.toLowerCase().includes(searchText.toLowerCase()) ||
        exam.code.toLowerCase().includes(searchText.toLowerCase())
      ) ?? [],
    [exams?.results, searchText]
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Entraînement</Text>
        <QuotaBadge />
      </View>

      <ErrorBanner error={error} />

      <Text style={styles.sectionLabel}>1. Choisissez un concours</Text>
      <TextField
        label="Rechercher un concours"
        placeholder="ENAM, Police, Douane, ENS..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />
      {selectedExamCode ? (
        <Pressable style={styles.searchCancelButton} onPress={handleCancelSelection}>
          <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.searchCancelText}>Annuler le concours</Text>
        </Pressable>
      ) : null}
      {loadingExams ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : (
        <View style={styles.examsWrap}>
          {filteredExams.map((item) => (
            <Pressable
              key={item.code}
              onPress={() => handleExamPress(item)}
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
          ))}
        </View>
      )}

      {selectedExamCode && (
        <>
          {loadingDetail ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : null}
          <Text style={styles.sectionLabel}>2. Niveau de difficulté</Text>
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

          <Text style={styles.sectionLabel}>3. Choisissez votre action</Text>
          <Pressable
            style={[styles.startButton, (isGenerating || loadingDetail || !selectedSubject) ? styles.startButtonDisabled : null]}
            onPress={handleStart}
            disabled={isGenerating || loadingDetail || !selectedSubject}
          >
            {isGenerating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.white} />
                <Text style={styles.startButtonText}>Sortir mon QCM</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.pdfButton} onPress={() => router.push({ pathname: "/subscription" })}>
            <Text style={styles.pdfButtonText}>Acheter support PDF</Text>
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
  highlightText: { ...typography.bodyMedium, color: colors.primary, marginBottom: spacing.sm },
  examsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  examChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: "100%",
  },
  examChipEmoji: { fontSize: 15 },
  examChipText: { ...typography.captionMedium, color: colors.textPrimary, flexShrink: 1 },
  examChipTextActive: { color: colors.white },
  subjectsWrap: { flexDirection: "column", gap: spacing.sm, marginBottom: spacing.lg },
  subjectCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  subjectCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
  subjectName: { ...typography.bodyMedium, color: colors.textPrimary },
  subjectNameActive: { color: colors.primary },
  helperText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
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
    marginBottom: spacing.sm,
  },
  startButtonDisabled: { opacity: 0.7 },
  startButtonText: { ...typography.bodyMedium, color: colors.white },
  pdfButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing.xxl,
  },
  pdfButtonText: { ...typography.captionMedium, color: colors.primary },
  searchInput: {
    marginBottom: spacing.lg,
  },
  searchCancelButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  searchCancelText: { ...typography.captionMedium, color: colors.textSecondary },
});
