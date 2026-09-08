import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/ScreenContainer";
import { useGetQCMSessionQuery, useSubmitAnswerMutation } from "@/store/api/aiEngineApi";
import { colors, radii, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

interface AnswerResult {
  is_correct: boolean;
  correct_choice_key: string;
  explanation: string;
}

export default function QCMSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session, isLoading } = useGetQCMSessionQuery(id, { skip: !id });
  const [submitAnswer, { isLoading: isSubmitting }] = useSubmitAnswerMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<number, AnswerResult>>({});
  const [showCorrections, setShowCorrections] = useState(false);
  const { t } = useLanguage();

  const questions = session?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const currentResult = currentQuestion ? results[currentQuestion.id] : undefined;

  const correctCount = useMemo(() => Object.values(results).filter((r) => r.is_correct).length, [results]);
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFinished = questions.length > 0 && Object.keys(results).length === questions.length;

  if (isLoading || !session) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </ScreenContainer>
    );
  }

  const handleSelect = (key: string) => {
    if (currentResult) return; // déjà répondu, on ne change plus la sélection
    setSelectedKey(key);
  };

  const handleValidate = async () => {
    if (!currentQuestion || !selectedKey) return;
    try {
      const result = await submitAnswer({ question: currentQuestion.id, selected_choice_key: selectedKey }).unwrap();
      setResults((prev) => ({ ...prev, [currentQuestion.id]: result }));
    } catch {
      // silencieux : l'utilisateur peut réessayer
    }
  };

  const handleNext = () => {
    setSelectedKey(null);
    setCurrentIndex((i) => i + 1);
  };

  if (isFinished) {
    const scorePercent = Math.round((correctCount / questions.length) * 100);
    const incorrectCount = questions.length - correctCount;
    const resultTone = scorePercent >= 70 ? styles.scoreCircleSuccess : scorePercent >= 50 ? styles.scoreCircleAverage : styles.scoreCircleNeedsWork;
    return (
      <ScreenContainer scrollable style={styles.resultContainer}>
        <View style={styles.resultHeader}>
          <View style={styles.resultHeaderIcon}>
            <Ionicons name="trophy" size={22} color={colors.warning} />
          </View>
          <View style={styles.resultHeaderCopy}>
            <Text style={styles.resultEyebrow}>{t("Session terminée")}</Text>
            <Text style={styles.resultHeaderTitle}>{t("Votre résultat")}</Text>
          </View>
          <Pressable onPress={() => router.replace("/(tabs)")} accessibilityRole="button" accessibilityLabel={t("Retour à l'accueil")}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.resultHero}>
          <View style={[styles.scoreCircle, resultTone]}>
            <Text style={styles.scoreCircleText}>{scorePercent}%</Text>
          </View>
          <Text style={styles.resultTitle}>{session.exam_name}</Text>
          <Text style={styles.resultSubject}>{session.subject_name}</Text>
          <Text style={styles.resultSubtitle}>
            {scorePercent >= 70 ? t("Excellent travail, continuez ainsi ! 🎉") : scorePercent >= 50 ? t("Bon rythme, consolidez encore vos acquis.") : t("Chaque erreur est une piste pour progresser.")}
          </Text>
        </View>

        <View style={styles.resultStats}>
          <ResultStat icon="checkmark-circle" value={String(correctCount)} label={t("Réponses correctes")} color={colors.accentGreen} />
          <ResultStat icon="refresh-circle" value={String(incorrectCount)} label={t("À revoir")} color={colors.warning} />
          <ResultStat icon="list" value={String(questions.length)} label={t("Total")} color={colors.primary} />
        </View>

        <Pressable style={({ pressed }) => [styles.reviewButton, pressed && styles.pressed]} onPress={() => setShowCorrections((visible) => !visible)}>
          <Ionicons name="document-text-outline" size={19} color={colors.primary} />
          <Text style={styles.reviewButtonText}>{t(showCorrections ? "Masquer les corrections" : "Revoir les corrections")}</Text>
          <Ionicons name={showCorrections ? "chevron-up" : "chevron-down"} size={18} color={colors.primary} />
        </Pressable>

        {showCorrections ? (
          <View style={styles.reviewList}>
            {questions.map((question, index) => {
              const answer = results[question.id];
              return (
                <View key={question.id} style={styles.reviewRow}>
                  <View style={[styles.reviewIndex, answer.is_correct ? styles.reviewIndexCorrect : styles.reviewIndexWrong]}>
                    <Text style={styles.reviewIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.reviewCopy}>
                    <Text style={styles.reviewQuestion} numberOfLines={2}>{question.question_text}</Text>
                    <Text style={styles.reviewStatus}>{answer.is_correct ? t("Bonne réponse !") : t("À revoir")}</Text>
                  </View>
                  <Ionicons name={answer.is_correct ? "checkmark-circle" : "alert-circle"} size={20} color={answer.is_correct ? colors.accentGreen : colors.warning} />
                </View>
              );
            })}
          </View>
        ) : null}

        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => router.replace("/(tabs)/practice")}>
          <Ionicons name="refresh" size={18} color={colors.white} />
          <Text style={styles.primaryButtonText}>{t("Nouvel entraînement")}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.secondaryButtonText}>{t("Retour à l'accueil")}</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.progressRow}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {currentIndex + 1}/{questions.length}
        </Text>
      </View>

      <Text style={styles.questionText}>{currentQuestion?.question_text}</Text>

      <View style={styles.choicesWrap}>
        {currentQuestion?.choices.map((choice) => {
          const isSelected = selectedKey === choice.key;
          const isCorrectChoice = currentResult && choice.key === currentResult.correct_choice_key;
          const isWrongSelected = currentResult && isSelected && !currentResult.is_correct;

          return (
            <Pressable
              key={choice.key}
              onPress={() => handleSelect(choice.key)}
              style={[
                styles.choiceCard,
                isSelected && !currentResult && styles.choiceCardSelected,
                isCorrectChoice && styles.choiceCardCorrect,
                isWrongSelected && styles.choiceCardWrong,
              ]}
            >
              <View style={styles.choiceKeyBadge}>
                <Text style={styles.choiceKeyText}>{choice.key}</Text>
              </View>
              <Text style={styles.choiceText}>{choice.text}</Text>
              {isCorrectChoice && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
              {isWrongSelected && <Ionicons name="close-circle" size={20} color={colors.error} />}
            </Pressable>
          );
        })}
      </View>

      {currentResult && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationTitle}>
            {currentResult.is_correct ? t("Bonne réponse !") : t("Pas tout à fait…")}
          </Text>
          <Text style={styles.explanationText}>{currentResult.explanation}</Text>
        </View>
      )}

      {currentResult ? (
        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>{isLastQuestion ? t("Voir mon score") : t("Question suivante")}</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.primaryButton, !selectedKey && styles.disabledButton]}
          onPress={handleValidate}
          disabled={!selectedKey || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{t("Valider")}</Text>}
        </Pressable>
      )}
    </ScreenContainer>
  );
}

function ResultStat({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; color: string }) {
  return (
    <View style={styles.resultStat}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.resultStatValue}>{value}</Text>
      <Text style={styles.resultStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  resultContainer: { paddingTop: spacing.lg },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  resultHeaderIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: `${colors.warning}1A`, alignItems: "center", justifyContent: "center" },
  resultHeaderCopy: { flex: 1 },
  resultEyebrow: { ...typography.tiny, color: colors.primary, letterSpacing: 1 },
  resultHeaderTitle: { ...typography.h2, color: colors.textPrimary },
  resultHero: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xxl },
  progressBarTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: radii.full },
  progressBarFill: { height: 6, backgroundColor: colors.primary, borderRadius: radii.full },
  progressLabel: { ...typography.captionMedium, color: colors.textSecondary },
  questionText: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xxl },
  choicesWrap: { gap: spacing.md, marginBottom: spacing.xl },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  choiceCardSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
  choiceCardCorrect: { borderColor: colors.success, backgroundColor: `${colors.success}14` },
  choiceCardWrong: { borderColor: colors.error, backgroundColor: `${colors.error}14` },
  choiceKeyBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceKeyText: { ...typography.captionMedium, color: colors.textPrimary },
  choiceText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  explanationBox: { backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.xl },
  explanationTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs },
  explanationText: { ...typography.body, color: colors.textSecondary },
  primaryButton: {
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { ...typography.bodyMedium, color: colors.white },
  secondaryButton: { height: 52, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { ...typography.bodyMedium, color: colors.primary },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  scoreCircleSuccess: { backgroundColor: colors.accentGreen },
  scoreCircleAverage: { backgroundColor: colors.primary },
  scoreCircleNeedsWork: { backgroundColor: colors.warning },
  scoreCircleText: { ...typography.display, color: colors.white },
  resultTitle: { ...typography.h2, color: colors.textPrimary, textAlign: "center", marginBottom: spacing.xs },
  resultSubject: { ...typography.captionMedium, color: colors.primary, marginBottom: spacing.sm },
  resultSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.xxl },
  resultStats: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  resultStat: { flex: 1, alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  resultStatValue: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xs },
  resultStatLabel: { ...typography.tiny, color: colors.textSecondary, textAlign: "center", marginTop: 2 },
  reviewButton: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radii.md, marginBottom: spacing.md },
  reviewButtonText: { ...typography.bodyMedium, color: colors.primary, flex: 1 },
  reviewList: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.md },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewIndex: { width: 30, height: 30, borderRadius: radii.full, alignItems: "center", justifyContent: "center" },
  reviewIndexCorrect: { backgroundColor: `${colors.accentGreen}1A` },
  reviewIndexWrong: { backgroundColor: `${colors.warning}1A` },
  reviewIndexText: { ...typography.captionMedium, color: colors.textPrimary },
  reviewCopy: { flex: 1 },
  reviewQuestion: { ...typography.captionMedium, color: colors.textPrimary },
  reviewStatus: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  pressed: { opacity: 0.75 },
});
