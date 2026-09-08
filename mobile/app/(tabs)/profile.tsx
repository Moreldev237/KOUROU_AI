import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useGetMeQuery } from "@/store/api/authApi";
import { useAuth } from "@/hooks/useAuth";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import { disableTrainingReminder, enableTrainingReminder, isTrainingReminderEnabled } from "@/api/trainingReminder";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  const { data: user } = useGetMeQuery();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    isTrainingReminderEnabled().then(setReminderEnabled).catch(() => {});
  }, []);

  const handleReminderChange = async (enabled: boolean) => {
    setIsUpdatingReminder(true);
    try {
      if (enabled) {
        const scheduled = await enableTrainingReminder(language);
        if (!scheduled) {
          Alert.alert(t("Rappel d'entraînement"), t("Autorisez les notifications pour activer le rappel."));
          return;
        }
      } else {
        await disableTrainingReminder();
      }
      setReminderEnabled(enabled);
    } catch {
      Alert.alert(t("Rappel d'entraînement"), t("Impossible de modifier le rappel pour le moment."));
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
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
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.huge }}
    >
      <View style={styles.avatarWrap}>
        <Text style={styles.pageEyebrow}>{t("ESPACE CANDIDAT")}</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{(user.full_name || "?").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.greeting}>{t("Bonjour,")}</Text>
        <Text style={styles.name}>{user.full_name || t("Candidat")}</Text>
        <Text style={styles.contact}>{user.phone_number || user.email}</Text>
        {user.referrer ? <Text style={styles.referrer}>{t("Parrain :")} {user.referrer}</Text> : null}
        <View style={[styles.premiumBadge, user.is_premium ? styles.premiumActive : styles.premiumFree]}>
          <Ionicons name={user.is_premium ? "star" : "person-outline"} size={13} color={user.is_premium ? colors.white : colors.primary} />
          <Text style={[styles.premiumBadgeText, !user.is_premium && styles.premiumFreeText]}>{user.is_premium ? t("Compte Premium") : t("Compte Gratuit")}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t("Mes filleuls")}</Text>
      <View style={styles.profileCard}>
        {user.referred_users.length ? (
          user.referred_users.map((filleul) => (
            <View key={filleul.id} style={styles.filleulRow}>
              <Text style={styles.filleulName}>{filleul.full_name}</Text>
              <Text style={styles.filleulContact}>{filleul.phone_number || filleul.email || t("Contact non renseigné")}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.profileValue}>{t("Aucun filleul pour le moment.")}</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t("preferences")}</Text>
      <View style={styles.sectionBlock}>
      <View style={styles.linkCard}>
        <View style={styles.linkCardIcon}>
          <Ionicons name="language-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.linkCardTextWrap}>
          <Text style={styles.linkCardTitle}>{t("language")}</Text>
          <Text style={styles.linkCardSubtitle}>{t("languageSubtitle")}</Text>
        </View>
        <LanguageSwitcher compact />
      </View>
      <View style={styles.linkCard}>
        <View style={styles.linkCardIcon}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.linkCardTextWrap}>
          <Text style={styles.linkCardTitle}>{t("Rappel d'entraînement")}</Text>
          <Text style={styles.linkCardSubtitle}>{t("Recevoir un rappel chaque jour à 18 h")}</Text>
        </View>
        <Switch
          value={reminderEnabled}
          onValueChange={handleReminderChange}
          disabled={isUpdatingReminder}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={reminderEnabled ? colors.primary : colors.textTertiary}
        />
      </View>
      </View>
      <Text style={styles.sectionTitle}>{t("Aide et informations")}</Text>
      <View style={styles.sectionBlock}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Politique de confidentialité")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/privacy-policy")}>
        <View style={styles.linkCardIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.linkCardTextWrap}>
          <Text style={styles.linkCardTitle}>{t("Politique de confidentialité")}</Text>
          <Text style={styles.linkCardSubtitle}>{t("Consulter l'utilisation de vos données")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("À propos")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/about")}>
          <View style={styles.linkCardIcon}><Ionicons name="information-circle-outline" size={20} color={colors.primary} /></View>
          <View style={styles.linkCardTextWrap}><Text style={styles.linkCardTitle}>{t("À propos")}</Text><Text style={styles.linkCardSubtitle}>{t("Découvrir Kourou AI")}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Support client")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/support")}>
          <View style={styles.linkCardIcon}><Ionicons name="headset-outline" size={20} color={colors.primary} /></View>
          <View style={styles.linkCardTextWrap}><Text style={styles.linkCardTitle}>{t("Support client")}</Text><Text style={styles.linkCardSubtitle}>{t("Besoin d'aide ?")}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Noter l'application")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/rate-app")}>
          <View style={styles.linkCardIcon}><Ionicons name="star-outline" size={20} color={colors.primary} /></View>
          <View style={styles.linkCardTextWrap}><Text style={styles.linkCardTitle}>{t("Noter l'application")}</Text><Text style={styles.linkCardSubtitle}>{t("Partager votre avis")}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Licence")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/license")}>
          <View style={styles.linkCardIcon}><Ionicons name="document-text-outline" size={20} color={colors.primary} /></View>
          <View style={styles.linkCardTextWrap}><Text style={styles.linkCardTitle}>{t("Licence")}</Text><Text style={styles.linkCardSubtitle}>{t("Informations légales")}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Clause de non-responsabilité")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/disclaimer")}>
          <View style={styles.linkCardIcon}><Ionicons name="warning-outline" size={20} color={colors.primary} /></View>
          <View style={styles.linkCardTextWrap}><Text style={styles.linkCardTitle}>{t("Clause de non-responsabilité")}</Text><Text style={styles.linkCardSubtitle}>{t("Limites de l'application")}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Questions fréquentes")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/faq")}>
          <View style={styles.linkCardIcon}><Ionicons name="help-circle-outline" size={20} color={colors.primary} /></View>
          <View style={styles.linkCardTextWrap}><Text style={styles.linkCardTitle}>{t("Questions fréquentes")}</Text><Text style={styles.linkCardSubtitle}>{t("Trouver rapidement une réponse")}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>

      {user.is_staff ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t("Statistiques administrateur")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/admin-stats")}>
          <View style={styles.linkCardIcon}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.linkCardTextWrap}>
            <Text style={styles.linkCardTitle}>{t("Statistiques administrateur")}</Text>
            <Text style={styles.linkCardSubtitle}>{t("Utilisateurs, abonnements et revenus")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
      </View>

      <Text style={styles.sectionTitle}>{t("Sécurité")}</Text>
      <View style={styles.sectionBlock}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Changer le mot de passe")} style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]} onPress={() => router.push("/change-password")}>
        <View style={styles.linkCardIcon}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.linkCardTextWrap}>
          <Text style={styles.linkCardTitle}>{t("Changer de mot de passe")}</Text>
          <Text style={styles.linkCardSubtitle}>{t("Modifier les accès de votre compte")}</Text>
        </View>
      </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t("Compte")}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Se déconnecter")}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        onPress={confirmLogout}
      >
        <View style={styles.logoutIcon}>
          <Ionicons name="log-out-outline" size={19} color={colors.error} />
        </View>
        <View style={styles.logoutCopy}>
          <Text style={styles.logoutText}>{t("Se déconnecter")}</Text>
          <Text style={styles.logoutSubtitle}>{t("Fermer votre session sur cet appareil")}</Text>
        </View>
      </Pressable>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModal}>
            <View style={styles.logoutModalIcon}>
              <Ionicons name="log-out-outline" size={24} color={colors.error} />
            </View>
            <Text style={styles.logoutModalTitle}>{t("Se déconnecter ?")}</Text>
            <Text style={styles.logoutModalText}>
              {t("Voulez-vous vraiment fermer votre session sur cet appareil ?")}
            </Text>
            <View style={styles.logoutModalActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && styles.logoutButtonPressed]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t("Annuler")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmLogoutButton, pressed && styles.logoutButtonPressed]}
                onPress={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
              >
                <Text style={styles.confirmLogoutText}>{t("Se déconnecter")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  avatarWrap: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    ...shadows.card,
  },
  pageEyebrow: { ...typography.tiny, color: colors.accentSky, letterSpacing: 0.8, marginBottom: spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentSky,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarInitial: { ...typography.display, color: colors.white },
  greeting: { ...typography.caption, color: "rgba(255,255,255,0.78)" },
  name: { ...typography.h1, color: colors.white, textAlign: "center", marginTop: 2, maxWidth: "100%", flexShrink: 1 },
  contact: { ...typography.body, color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, maxWidth: "100%", flexShrink: 1 },
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
  premiumFree: { backgroundColor: colors.primarySoft },
  premiumBadgeText: { ...typography.tiny, color: colors.white },
  premiumFreeText: { color: colors.primary },
  referrer: { ...typography.caption, color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, maxWidth: "100%", flexShrink: 1 },
  sectionTitle: { ...typography.captionMedium, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },
  sectionBlock: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: spacing.xl },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
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
    alignItems: "flex-start",
    minHeight: 48,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  profileLabel: { ...typography.caption, color: colors.textSecondary, flex: 0.9, flexShrink: 1 },
  profileValue: { ...typography.body, color: colors.textPrimary, flex: 1.1, textAlign: "right", flexShrink: 1, minWidth: 0 },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: spacing.md,
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkCardPressed: { opacity: 0.72 },
  linkCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  linkCardTextWrap: { flex: 1, minWidth: 0 },
  linkCardTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs, flexShrink: 1 },
  linkCardSubtitle: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.error}0D`,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
    borderRadius: radii.md,
    minHeight: 72,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoutText: { ...typography.bodyMedium, color: colors.error },
  logoutSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2, flexShrink: 1 },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutCopy: { flex: 1, minWidth: 0 },
  logoutButtonPressed: { opacity: 0.7 },
  logoutOverlay: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  logoutModal: { width: "100%", maxWidth: 420, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, alignItems: "center", ...shadows.floating },
  logoutModalIcon: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: `${colors.error}12`, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  logoutModalTitle: { ...typography.h2, color: colors.textPrimary, textAlign: "center" },
  logoutModalText: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, lineHeight: 22 },
  logoutModalActions: { flexDirection: "row", width: "100%", gap: spacing.sm, marginTop: spacing.xl },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  confirmLogoutButton: { flex: 1, minHeight: 48, borderRadius: radii.md, backgroundColor: colors.error, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  cancelButtonText: { ...typography.bodyMedium, color: colors.textSecondary },
  confirmLogoutText: { ...typography.bodyMedium, color: colors.white, textAlign: "center" },
});
