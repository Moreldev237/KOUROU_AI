import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";

import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useRegisterMutation } from "@/store/api/authApi";
import { colors, spacing, typography } from "@/theme";
import type { StudyLevel } from "@/types";

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
  const [register, { isLoading, error }] = useRegisterMutation();
  const { applyAuthResult } = useAuth();

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
      const result = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        password,
        study_level: studyLevel,
      }).unwrap();

      if (result.requires_otp && result.phone_number) {
        router.push({ pathname: "/(auth)/otp-verify", params: { phone_number: result.phone_number } });
      } else if (result.user && result.access && result.refresh) {
        await applyAuthResult({ user: result.user, access: result.access, refresh: result.refresh });
      }
    } catch {
      // erreur affichée via ErrorBanner
    }
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoignez KOUROU AI et préparez votre concours avec l&apos;IA.</Text>
      </View>

      <ErrorBanner error={error} />

      <TextField
        label="Nom complet"
        placeholder="Votre nom et prénom"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextField
        label="Adresse e-mail"
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.infoText}>
        Si vous renseignez un e-mail, le code de validation sera envoyé par e-mail.
      </Text>

      <TextField
        label="Numéro de téléphone"
        placeholder="+237XXXXXXXXX"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      <TextField
        label="Mot de passe"
        placeholder="8 caractères minimum"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.levelContainer}>
        <Text style={styles.label}>Dernier diplôme obtenu</Text>
        <View style={styles.levelGrid}>
          {STUDY_LEVELS.map((level) => (
            <StudyLevelButton
              key={level.value}
              label={level.label}
              active={studyLevel === level.value}
              onPress={() => setStudyLevel(level.value)}
            />
          ))}
        </View>
      </View>

      <Button label="Créer mon compte" onPress={handleSubmit} loading={isLoading} disabled={!canSubmit} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Déjà un compte ?</Text>
        <Link href="/(auth)/login">
          <Text style={styles.footerLink}> Se connecter</Text>
        </Link>
      </View>
    </ScreenContainer>
  );
}

function StudyLevelButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={[styles.levelButton, active && styles.levelButtonActive]} pointerEvents={active ? "none" : "auto"}>
      <Text
        onPress={onPress}
        style={[styles.levelButtonText, active && styles.levelButtonTextActive]}
      >
        {label}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { marginBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary },
  levelContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  levelButton: {
    flex: 1,
    minWidth: "30%",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  levelButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  levelButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: "center",
  },
  levelButtonTextActive: {
    color: colors.surface,
    fontWeight: "600",
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xxl },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.bodyMedium, color: colors.primary },
});
