import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TextField } from "@/components/TextField";
import { useGetMeQuery, useUpdateMeMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import { useListExamsQuery } from "@/store/api/examsApi";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, spacing, typography } from "@/theme";
import type { ExamListItem, StudyLevel } from "@/types";

const STUDY_LEVELS: { label: string; value: StudyLevel }[] = [
  { label: "CEP", value: "cep" },
  { label: "BEPC", value: "bepc" },
  { label: "BAC", value: "bac" },
  { label: "Licence", value: "licence" },
  { label: "Master", value: "master" },
  { label: "Autre", value: "autre" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: user } = useGetMeQuery();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [studyLevel, setStudyLevel] = useState<StudyLevel>("bac");
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation();
  const dispatch = useAppDispatch();
  const { logout } = useAuth();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhoneNumber(user.phone_number || "");
      setStudyLevel(user.study_level || "bac");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    const trimmedFullName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    const changedFields: Partial<{ full_name: string; phone_number: string; study_level: StudyLevel }> = {};

    if (trimmedFullName && trimmedFullName !== user.full_name) {
      changedFields.full_name = trimmedFullName;
    }
    if (trimmedPhone !== (user.phone_number || "")) {
      changedFields.phone_number = trimmedPhone;
    }
    
    if (studyLevel !== user.study_level) {
      changedFields.study_level = studyLevel;
    }

    if (!Object.keys(changedFields).length) {
      setStatusMessage("Aucune modification à enregistrer.");
      return;
    }

    try {
      const updated = await updateMe(changedFields).unwrap();
      dispatch(setUser(updated));
      setStatusMessage("Profil mis à jour.");
    } catch {
      setStatusMessage("Impossible de mettre à jour le profil.");
    }
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
        {user.referrer ? <Text style={styles.referrer}>Parrain : {user.referrer}</Text> : null}
        <View style={[styles.premiumBadge, user.is_premium ? styles.premiumActive : styles.premiumFree]}>
          <Ionicons name={user.is_premium ? "star" : "ellipse"} size={12} color={colors.white} />
          <Text style={styles.premiumBadgeText}>{user.is_premium ? "Compte Premium" : "Compte Gratuit"}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Profil</Text>
      <View style={styles.profileCard}>
        <TextField label="Nom complet" value={fullName} onChangeText={setFullName} />
        <TextField
          label="Numéro de téléphone"
          placeholder="+237XXXXXXXXX"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Email</Text>
          <Text style={styles.profileValue}>{user.email || "Non renseigné"}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Dernier diplôme</Text>
          <Text style={styles.profileValue}>{STUDY_LEVELS.find((l) => l.value === studyLevel)?.label ?? studyLevel.toUpperCase()}</Text>
        </View>
        <Pressable style={styles.profileRow} onPress={() => setShowStudyModal(true)}>
          <Text style={styles.profileLabel}>Modifier le dernier diplôme</Text>
          <View style={styles.rowAction}>
            <Text style={styles.profileValue}>{STUDY_LEVELS.find((l) => l.value === studyLevel)?.label}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.primary} />
          </View>
        </Pressable>

        <Modal visible={showStudyModal} animationType="slide" transparent onRequestClose={() => setShowStudyModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choisir le dernier diplôme</Text>
                <TouchableOpacity onPress={() => setShowStudyModal(false)}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
                {STUDY_LEVELS.map((level) => (
                  <Pressable
                    key={level.value}
                    onPress={() => {
                      setStudyLevel(level.value);
                      setShowStudyModal(false);
                    }}
                    style={[styles.modalItem, studyLevel === level.value && styles.modalItemActive]}
                  >
                    <Text style={[styles.modalItemText, studyLevel === level.value && styles.modalItemTextActive]}>
                      {level.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
        {/* Concours visé déplacé : sélection se fait depuis l'écran Entraînement */}
      </View>

      {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}

      <Pressable style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSaveProfile} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
        )}
      </Pressable>

      <Text style={styles.sectionTitle}>Mes filleuls</Text>
      <View style={styles.profileCard}>
        {user.referred_users.length ? (
          user.referred_users.map((filleul) => (
            <View key={filleul.id} style={styles.filleulRow}>
              <Text style={styles.filleulName}>{filleul.full_name}</Text>
              <Text style={styles.filleulContact}>{filleul.phone_number || filleul.email || "Contact non renseigné"}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.profileValue}>Aucun filleul pour le moment.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Préférences</Text>
      <Pressable style={styles.linkCard} onPress={() => router.push("/(tabs)/subscription")}>
        <View style={styles.linkCardIcon}>
          <Ionicons name="card-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.linkCardTextWrap}>
          <Text style={styles.linkCardTitle}>Gérer mon abonnement</Text>
          <Text style={styles.linkCardSubtitle}>Voir mes formules et avantages</Text>
        </View>
      </Pressable>
      <Pressable style={styles.linkCard} onPress={() => router.push("/(tabs)/tutor")}>
        <View style={styles.linkCardIcon}>
          <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.linkCardTextWrap}>
          <Text style={styles.linkCardTitle}>Mes conversations Tuteur IA</Text>
          <Text style={styles.linkCardSubtitle}>Retrouver vos échanges avec le tuteur</Text>
        </View>
      </Pressable>

      <Text style={styles.sectionTitle}>Sécurité</Text>
      <Pressable style={styles.linkCard} onPress={() => router.push("/change-password")}>
        <View style={styles.linkCardIcon}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.linkCardTextWrap}>
          <Text style={styles.linkCardTitle}>Changer de mot de passe</Text>
          <Text style={styles.linkCardSubtitle}>Modifier les accès de votre compte</Text>
        </View>
      </Pressable>

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
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  premiumActive: { backgroundColor: colors.accentGreen },
  premiumFree: { backgroundColor: colors.surface },
  premiumBadgeText: { ...typography.tiny, color: colors.white },
  referrer: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.captionMedium, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filleulRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  filleulName: { ...typography.bodyMedium, color: colors.textPrimary },
  filleulContact: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  chooseButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  chooseButtonText: { ...typography.body, color: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: colors.background, padding: spacing.lg, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.sm },
  modalTitle: { ...typography.h2, color: colors.textPrimary, flex: 1, flexShrink: 1 },
  modalItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemActive: { backgroundColor: `${colors.primary}0D` },
  modalItemText: { ...typography.body, color: colors.textPrimary },
  modalItemTextActive: { color: colors.primary },
  profileLabel: { ...typography.caption, color: colors.textSecondary, flex: 1, flexShrink: 1 },
  profileValue: { ...typography.body, color: colors.textPrimary, textAlign: "right", maxWidth: "70%" },
  statusMessage: { ...typography.captionMedium, color: colors.textSecondary, marginVertical: spacing.sm, textAlign: "center" },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { ...typography.bodyMedium, color: colors.white },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  linkCardTextWrap: { flex: 1 },
  linkCardTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs },
  linkCardSubtitle: { ...typography.caption, color: colors.textSecondary },
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
