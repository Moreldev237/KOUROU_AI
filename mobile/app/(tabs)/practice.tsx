import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ErrorBanner } from "@/components/ErrorBanner";
import { useLanguage } from "@/i18n";
import { cacheExam, cacheExams, getCachedExam, getCachedExams } from "@/api/catalogStorage";
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
import type { Difficulty, ExamDetail, ExamListItem } from "@/types";

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "facile", label: "Facile" },
  { key: "moyen", label: "Moyen" },
  { key: "difficile", label: "Difficile" },
];

export default function PracticeScreen() {
  const { language } = useLanguage();
  const { data: user } = useGetMeQuery();
  const { data: exams, isLoading: loadingExams } = useListExamsQuery();
  const [cachedExams, setCachedExams] = useState<ExamListItem[]>([]);
  const [updateMe] = useUpdateMeMutation();
  const dispatch = useAppDispatch();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedExamCode, setSelectedExamCode] = useState<string | null>(null);
  const clearingExamRef = useRef(false);
  const { data: examDetail, isFetching: loadingDetail } = useGetExamQuery(selectedExamCode ?? "", {
    skip: !selectedExamCode,
  });
  const [cachedExamDetail, setCachedExamDetail] = useState<ExamDetail | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("moyen");
  const [generationMessageIndex, setGenerationMessageIndex] = useState(0);
  const [generateQCM, { isLoading: isGenerating, error }] = useGenerateQCMMutation();
  const { t } = useLanguage();

  useEffect(() => {
    getCachedExams().then(setCachedExams);
  }, []);

  useEffect(() => {
    if (exams?.results?.length) {
      setCachedExams(exams.results);
      cacheExams(exams.results).catch(() => {});
    }
  }, [exams?.results]);

  useEffect(() => {
    if (!selectedExamCode) return;
    if (examDetail) {
      setCachedExamDetail(examDetail);
      cacheExam(examDetail).catch(() => {});
      return;
    }
    getCachedExam(selectedExamCode).then(setCachedExamDetail);
  }, [examDetail, selectedExamCode]);

  useEffect(() => {
    if (clearingExamRef.current || !user?.target_exam || selectedExamCode || !exams?.results?.length) return;
    const targetExam = exams.results.find((exam) => exam.id === user.target_exam);
    if (targetExam) {
      setSelectedExamCode(targetExam.code);
      setSearchText(targetExam.name);
    }
  }, [user?.target_exam, exams?.results, selectedExamCode]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setGenerationMessageIndex((current) => (current + 1) % 3);
    }, 2600);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleStart = async () => {
    const activeExam = examDetail ?? cachedExamDetail;
    const activeSubject = activeExam?.subjects[0];
    if (!activeExam || !activeSubject) return;
    try {
      const session = await generateQCM({
        exam: activeExam.id,
        subject: activeSubject.id,
        topic: null,
        mode: "qcm_batch",
        difficulty,
        question_count: 5,
        language,
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
    setCachedExamDetail(null);
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
      setCachedExamDetail(null);
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
    setCachedExamDetail(null);
    setSearchText(item.name);
    try {
      const updated = await updateMe({ target_exam: item.id }).unwrap();
      dispatch(setUser(updated));
    } catch {
      // silent
    }
  };

  const availableExams = exams?.results?.length ? exams.results : cachedExams;
  const activeExam = examDetail ?? cachedExamDetail;
  const activeSubject = activeExam?.subjects[0] ?? null;
  const categories = Array.from(new Set(availableExams.map((exam) => exam.organizing_body).filter(Boolean)));
  const filteredExams = useMemo(
    () =>
      availableExams.filter((exam) =>
        (selectedCategory === "all" || exam.organizing_body === selectedCategory) &&
        exam.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (selectedCategory === "all" || exam.organizing_body === selectedCategory) &&
        (exam.organizing_body.toLowerCase().includes(searchText.toLowerCase()) ||
        exam.code.toLowerCase().includes(searchText.toLowerCase()))
      ) ?? [],
    [availableExams, searchText, selectedCategory]
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>{t("Entraînement")}</Text>
        <QuotaBadge />
      </View>

      <ErrorBanner error={error} />

      <Text style={styles.sectionLabel}>{t("1. Choisissez un concours")}</Text>
      <TextField
        label={t("Rechercher un concours")}
        placeholder={t("ENAM, Police, Douane, ENS...")}
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />
      {selectedExamCode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Annuler le concours")}
          style={({ pressed }) => [styles.searchCancelButton, pressed && styles.searchCancelPressed]}
          onPress={handleCancelSelection}
        >
          <Ionicons name="close-circle" size={19} color={colors.error} />
          <Text style={styles.searchCancelText}>{t("Annuler le concours")}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.sectionLabel}>{t("Catégorie")}</Text>
      <View style={styles.categoryRow}>
        <Pressable style={[styles.categoryChip, selectedCategory === "all" && styles.categoryChipActive]} onPress={() => setSelectedCategory("all")}>
          <Text style={[styles.categoryText, selectedCategory === "all" && styles.categoryTextActive]}>{t("Toutes")}</Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable key={category} style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]} onPress={() => setSelectedCategory(category)}>
            <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>{category}</Text>
          </Pressable>
        ))}
      </View>
      {loadingExams && !availableExams.length ? (
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
          {loadingDetail && !activeExam ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : null}
          {activeExam?.description ? (
            <View style={styles.examDescription}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.examDescriptionText}>{activeExam.description}</Text>
            </View>
          ) : null}
          <Text style={styles.autoSubjectNote}>{t("Le QCM est adapté automatiquement au programme du concours sélectionné.")}</Text>
          <Text style={styles.sectionLabel}>{t("2. Niveau de difficulté")}</Text>
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

          <Text style={styles.sectionLabel}>{t("3. Choisissez votre action")}</Text>
          {isGenerating ? (
            <View style={styles.generationPanel}>
              <View style={styles.generationIcon}>
                <ActivityIndicator color={colors.white} />
              </View>
              <View style={styles.generationCopy}>
                <Text style={styles.generationTitle}>{t("Préparation de votre QCM")}</Text>
                <Text style={styles.generationMessage}>
                  {t([
                    "Nous préparons une série adaptée à votre concours.",
                    "Nous vérifions les questions et les corrections.",
                    "Votre entraînement sera prêt dans quelques instants.",
                  ][generationMessageIndex])}
                </Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.startButton, (loadingDetail || !activeSubject || !activeExam) ? styles.startButtonDisabled : null, pressed && styles.startButtonPressed]}
              onPress={handleStart}
              disabled={loadingDetail || !activeSubject || !activeExam}
            >
              <Ionicons name="sparkles" size={18} color={colors.white} />
              <Text style={styles.startButtonText}>{t("Sortir mon QCM")}</Text>
            </Pressable>
          )}
          <Pressable style={styles.pdfButton} onPress={() => router.push({ pathname: "/subscription" })}>
            <Text style={styles.pdfButtonText}>{t("Acheter support PDF")}</Text>
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
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  categoryChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.full, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, maxWidth: "100%" },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { ...typography.caption, color: colors.textSecondary },
  categoryTextActive: { color: colors.white },
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
  autoSubjectNote: { ...typography.caption, color: colors.primaryDark, backgroundColor: colors.primarySoft, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.md },
  examDescription: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  examDescriptionText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 19 },
  topicsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  topicChip: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  topicText: { ...typography.captionMedium, color: colors.textSecondary, textAlign: "center", flexShrink: 1 },
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
  topicChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
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
  startButtonPressed: { opacity: 0.82 },
  startButtonText: { ...typography.bodyMedium, color: colors.white },
  generationPanel: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.primaryDark, borderRadius: radii.md, minHeight: 86, padding: spacing.lg, marginBottom: spacing.sm },
  generationIcon: { width: 42, height: 42, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  generationCopy: { flex: 1 },
  generationTitle: { ...typography.bodyMedium, color: colors.white },
  generationMessage: { ...typography.caption, color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, lineHeight: 19 },
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
    justifyContent: "center",
    alignSelf: "stretch",
    gap: spacing.sm,
    minHeight: 46,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: `${colors.error}0D`,
    borderWidth: 1,
    borderColor: `${colors.error}55`,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  searchCancelPressed: { opacity: 0.7 },
  searchCancelText: { ...typography.bodyMedium, color: colors.error },
});
