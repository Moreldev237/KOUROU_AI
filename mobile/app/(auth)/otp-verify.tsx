import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useResendOtpMutation, useVerifyOtpMutation } from "@/store/api/authApi";
import { colors, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

export default function OTPVerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [verifyOtp, { isLoading, error }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const { applyAuthResult } = useAuth();
  const { t } = useLanguage();

  const handleVerify = async () => {
    try {
      const result = await verifyOtp({ email, code }).unwrap();
      await applyAuthResult(result);
    } catch {
      // erreur affichée via ErrorBanner
    }
  };

  const handleResend = async () => {
    setResendMessage(null);
      try {
      await resendOtp({ email, purpose: "registration" }).unwrap();
      setResendMessage(t("Un nouveau code a été envoyé par e-mail."));
    } catch {
      setResendMessage(t("Impossible de renvoyer le code pour le moment."));
    }
  };

  return (
    <ScreenContainer scrollable>
      <LanguageSwitcher />
      <View style={styles.header}>
        <Text style={styles.title}>{t("Vérifiez votre compte")}</Text>
        <Text style={styles.subtitle}>
          {t("Un code à 6 chiffres a été envoyé par e-mail.")}
        </Text>
      </View>

      <ErrorBanner error={error} />

      <TextField
        label={t("Code de vérification")}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        style={styles.codeInput}
      />

      <Button label={t("Vérifier")} onPress={handleVerify} loading={isLoading} disabled={code.length !== 6} />

      <View style={styles.resendRow}>
        {resendMessage && <Text style={styles.resendMessage}>{resendMessage}</Text>}
        <Text onPress={isResending ? undefined : handleResend} style={styles.resendLink}>
          {isResending ? t("Envoi en cours…") : t("Renvoyer le code")}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary },
  codeInput: { textAlign: "center", letterSpacing: 8, ...typography.h2 } as never,
  resendRow: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm },
  resendMessage: { ...typography.caption, color: colors.accentGreen },
  resendLink: { ...typography.bodyMedium, color: colors.primary },
});
