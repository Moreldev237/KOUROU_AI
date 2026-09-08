import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";

import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useRegisterMutation } from "@/store/api/authApi";
import type { RegisterRequest } from "@/store/api/authApi";
import { colors, radii, spacing, typography } from "@/theme";
import type { StudyLevel } from "@/types";
import { useLanguage } from "@/i18n";

const STUDY_LEVELS: { label: string; value: StudyLevel }[] = [
  { label: "CEP", value: "cep" },
  { label: "BEPC", value: "bepc" },
  { label: "BAC", value: "bac" },
  { label: "Licence", value: "licence" },
  { label: "Master", value: "master" },
  { label: "Autre", value: "autre" },
];

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [studyLevel, setStudyLevel] = useState<StudyLevel>("bac");
  const [showStudyLevelMenu, setShowStudyLevelMenu] = useState(false);
  const [referrer, setReferrer] = useState("");
  const [register, { isLoading, error }] = useRegisterMutation();
  const { applyAuthResult } = useAuth();
  const { t } = useLanguage();

  const isValidEmail = email.includes("@") && email.includes(".");
  const isValidPhone = phoneNumber.length >= 9;

  const canSubmit =
    fullName.length > 1 &&
    isValidEmail &&
    isValidPhone &&
    password.length >= 8 &&
    studyLevel;

  const handleSubmit = async () => {
    try {
      const payload: RegisterRequest = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        password,
        study_level: studyLevel,
      };
      if (referrer.trim()) {
        payload.referrer = referrer.trim();
      }

      const result = await register(payload).unwrap();

      if (result.requires_otp && result.email) {
        router.push({ pathname: "/(auth)/otp-verify", params: { email: result.email } });
      } else if (result.user && result.access && result.refresh) {
        await applyAuthResult({ user: result.user, access: result.access, refresh: result.refresh });
      }
    } catch {
      // erreur affichée via ErrorBanner
    }
  };

  return (
    <ScreenContainer scrollable>
      <LanguageSwitcher />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("KOUROU AI · INSCRIPTION")}</Text>
        <Text style={styles.title}>{t("Créer un compte")}</Text>
        <Text style={styles.subtitle}>{t("Préparez votre concours avec un espace adapté à votre progression.")}</Text>
      </View>

      <ErrorBanner error={error} />

      <Text style={styles.sectionTitle}>{t("Vos informations")}</Text>
      <TextField
        label={t("Nom complet")}
        placeholder={t("Votre nom et prénom")}
        value={fullName}
        onChangeText={setFullName}
      />

      <TextField
        label={t("Adresse e-mail")}
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.infoText}>
        {t("Si vous renseignez un e-mail, le code de validation sera envoyé par e-mail.")}
      </Text>

      <TextField
        label={t("Numéro de téléphone")}
        placeholder="+237XXXXXXXXX"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      <TextField
        label={t("Mot de passe")}
        placeholder={t("8 caractères minimum")}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextField
        label={t("Parrain")}
        placeholder={t("E-mail ou numéro (facultatif)")}
        value={referrer}
        onChangeText={setReferrer}
      />

      <Text style={styles.sectionTitle}>{t("Votre parcours")}</Text>
      <View style={styles.levelContainer}>
        <Text style={styles.label}>{t("Dernier diplôme obtenu")} <Text style={styles.optional}>{t("· facultatif")}</Text></Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showStudyLevelMenu }}
          onPress={() => setShowStudyLevelMenu(true)}
          style={({ pressed }) => [styles.selectButton, pressed && styles.selectButtonPressed]}
        >
          <Text style={styles.selectValue}>{STUDY_LEVELS.find((level) => level.value === studyLevel)?.label}</Text>
          <Text style={styles.selectHint}>{t("Modifier")}</Text>
          <Text style={styles.selectChevron}>⌄</Text>
        </Pressable>
      </View>

      <Modal
        visible={showStudyLevelMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStudyLevelMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowStudyLevelMenu(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>{t("Dernier diplôme obtenu")}</Text>
            <Text style={styles.menuSubtitle}>{t("Sélectionnez votre niveau d'études")}</Text>
            <View style={styles.menuOptions}>
              {STUDY_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: studyLevel === level.value }}
                  onPress={() => {
                    setStudyLevel(level.value);
                    setShowStudyLevelMenu(false);
                  }}
                  style={({ pressed }) => [styles.menuOption, studyLevel === level.value && styles.menuOptionActive, pressed && styles.menuOptionPressed]}
                >
                  <Text style={[styles.menuOptionText, studyLevel === level.value && styles.menuOptionTextActive]}>{level.label}</Text>
                  {studyLevel === level.value ? <Text style={styles.menuCheck}>✓</Text> : null}
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowStudyLevelMenu(false)} style={styles.menuCancelButton}>
              <Text style={styles.menuCancelText}>{t("Annuler")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Button label={t("Créer mon compte")} onPress={handleSubmit} loading={isLoading} disabled={!canSubmit} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("Déjà un compte ?")}</Text>
        <Link href="/(auth)/login">
          <Text style={styles.footerLink}> {t("Se connecter")}</Text>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xl },
  eyebrow: { ...typography.tiny, color: colors.primary, letterSpacing: 0.8, marginBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  levelContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  optional: { ...typography.caption, color: colors.textTertiary },
  selectButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  selectButtonPressed: { opacity: 0.75 },
  selectValue: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  selectHint: { ...typography.caption, color: colors.textTertiary },
  selectChevron: { fontSize: 24, lineHeight: 20, color: colors.primary, marginTop: -spacing.xs },
  menuOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", paddingHorizontal: spacing.lg },
  menuCard: { width: "100%", maxWidth: 460, alignSelf: "center", backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl },
  menuTitle: { ...typography.h2, color: colors.textPrimary },
  menuSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  menuOptions: { gap: spacing.sm },
  menuOption: { minHeight: 50, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.md },
  menuOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  menuOptionPressed: { opacity: 0.75 },
  menuOptionText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  menuOptionTextActive: { ...typography.bodyMedium, color: colors.primary },
  menuCheck: { ...typography.h3, color: colors.primary },
  menuCancelButton: { alignItems: "center", minHeight: 46, justifyContent: "center", marginTop: spacing.md },
  menuCancelText: { ...typography.bodyMedium, color: colors.textSecondary },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xxl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.bodyMedium, color: colors.primary },
});
