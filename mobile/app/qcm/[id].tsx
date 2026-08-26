import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/ScreenContainer";
import { useGetQCMSessionQuery, useSubmitAnswerMutation } from "@/store/api/aiEngineApi";
import { colors, radii, spacing, typography } from "@/theme";

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
    return (
      <ScreenContainer style={styles.centered}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreCircleText}>{scorePercent}%</Text>
        </View>
        <Text style={styles.resultTitle}>
          {correctCount} / {questions.length} bonnes réponses
        </Text>
        <Text style={styles.resultSubtitle}>
          {scorePercent >= 70 ? "Excellent travail, continuez ainsi ! 🎉" : "Continuez à vous entraîner, chaque session compte."}
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/(tabs)/practice")}>
          <Text style={styles.primaryButtonText}>Nouvel entraînement</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.secondaryButtonText}>Retour à l&apos;accueil</Text>
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
            {currentResult.is_correct ? "Bonne réponse !" : "Pas tout à fait…"}
          </Text>
          <Text style={styles.explanationText}>{currentResult.explanation}</Text>
        </View>
      )}

      {currentResult ? (
        <Pressable style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>{isLastQuestion ? "Voir mon score" : "Question suivante"}</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.primaryButton, !selectedKey && styles.disabledButton]}
          onPress={handleValidate}
          disabled={!selectedKey || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Valider</Text>}
        </Pressable>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
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
  scoreCircleText: { ...typography.display, color: colors.white },
  resultTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  resultSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.xxl },
});
