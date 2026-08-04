import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetMeQuery, useUpdateMeMutation } from "@/store/api/authApi";
import { useListExamsQuery } from "@/store/api/examsApi";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/theme";

const STUDY_LEVELS: { key: string; label: string }[] = [
  { key: "bepc", label: "BEPC" },
  { key: "bac", label: "Baccalauréat" },
  { key: "licence", label: "Licence" },
  { key: "master", label: "Master" },
  { key: "autre", label: "Autre" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: user } = useGetMeQuery();
  const { data: exams } = useListExamsQuery();
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation();
  const { logout } = useAuth();
  const [showExamPicker, setShowExamPicker] = useState(false);

  const handleSelectExam = async (examId: number) => {
    setShowExamPicker(false);
    await updateMe({ target_exam: examId }).unwrap().catch(() => {});
  };

  const handleSelectLevel = async (level: string) => {
    await updateMe({ study_level: level as never }).unwrap().catch(() => {});
  };

  const confirmLogout = () => {
    Alert.alert("Se déconnecter", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: logout },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.xxl, paddingBottom: spacing.huge }}
    >
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{(user.full_name || "?").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.contact}>{user.phone_number || user.email}</Text>
        {user.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color={colors.white} />
            <Text style={styles.premiumBadgeText}>Compte Premium</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Concours cible</Text>
      <Pressable style={styles.selectRow} onPress={() => setShowExamPicker((v) => !v)}>
        <Text style={styles.selectRowText}>{user.target_exam_name || "Choisir un concours"}</Text>
        <Ionicons name={showExamPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
      </Pressable>
      {showExamPicker && (
        <View style={styles.pickerList}>
          {exams?.results.map((exam) => (
            <Pressable key={exam.id} style={styles.pickerItem} onPress={() => handleSelectExam(exam.id)}>
              <Text style={styles.pickerItemText}>
                {exam.icon_emoji} {exam.name}
              </Text>
              {user.target_exam === exam.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Niveau d&apos;études</Text>
      <View style={styles.levelsRow}>
        {STUDY_LEVELS.map((level) => (
          <Pressable
            key={level.key}
            onPress={() => handleSelectLevel(level.key)}
            style={[styles.levelChip, user.study_level === level.key && styles.levelChipActive]}
          >
            <Text style={[styles.levelChipText, user.study_level === level.key && styles.levelChipTextActive]}>
              {level.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isSaving && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}

      <Pressable style={styles.logoutButton} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  avatarWrap: { alignItems: "center", marginBottom: spacing.xxl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarInitial: { ...typography.display, color: colors.white },
  name: { ...typography.h2, color: colors.textPrimary },
  contact: { ...typography.body, color: colors.textSecondary },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentGreen,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  premiumBadgeText: { ...typography.tiny, color: colors.white },
  sectionTitle: { ...typography.captionMedium, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },
  selectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectRowText: { ...typography.body, color: colors.textPrimary },
  pickerList: { backgroundColor: colors.surface, borderRadius: radii.md, marginTop: spacing.sm, overflow: "hidden" },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: { ...typography.body, color: colors.textPrimary },
  levelsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  levelChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  levelChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelChipText: { ...typography.captionMedium, color: colors.textSecondary },
  levelChipTextActive: { color: colors.white },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xxxl,
    padding: spacing.lg,
  },
  logoutText: { ...typography.bodyMedium, color: colors.error },
});
