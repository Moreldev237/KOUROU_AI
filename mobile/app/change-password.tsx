import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useChangePasswordMutation } from "@/store/api/authApi";
import { colors, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { t } = useLanguage();

  const [changePassword, { isLoading, error }] = useChangePasswordMutation();

  const handleSubmit = async () => {
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setSuccessMessage(null);
      return;
    }

    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword }).unwrap();
      setSuccessMessage(t("Mot de passe modifié avec succès."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // ErrorBanner handles displaying API errors
    }
  };

  const isButtonDisabled =
    !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword;

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>{t("Changer le mot de passe")}</Text>
        <Text style={styles.subtitle}>{t("Saisissez votre mot de passe actuel puis choisissez un nouveau mot de passe.")}</Text>
      </View>

      <ErrorBanner error={error} />
      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

      <TextField
        label={t("Mot de passe actuel")}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
      />
      <TextField
        label={t("Nouveau mot de passe")}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TextField
        label={t("Confirmer le nouveau mot de passe")}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <Button
        label={isLoading ? t("Enregistrement...") : t("Modifier le mot de passe")}
        loading={isLoading}
        onPress={handleSubmit}
        disabled={isButtonDisabled}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary },
  successText: { ...typography.bodyMedium, color: colors.accentGreen, marginBottom: spacing.lg },
});