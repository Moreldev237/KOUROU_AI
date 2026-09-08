import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n";
import { useLoginMutation } from "@/store/api/authApi";
import { colors, spacing, typography } from "@/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();
  const { applyAuthResult } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    try {
      const result = await login({ email: email.trim(), password }).unwrap();
      await applyAuthResult(result);
    } catch {
      // l'erreur est déjà affichée via `error` (ErrorBanner)
    }
  };

  return (
    <ScreenContainer scrollable>
      <LanguageSwitcher />
      <View style={styles.header}>
        <Text style={styles.title}>{t("Content de vous revoir")}</Text>
        <Text style={styles.subtitle}>{t("Connectez-vous pour continuer votre préparation.")}</Text>
      </View>

      <ErrorBanner error={error} />

      <TextField
        label={t("Adresse e-mail")}
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label={t("Mot de passe")}
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Link href="/(auth)/forgot-password" asChild>
        <Text style={styles.forgotLink}>{t("Mot de passe oublié ?")}</Text>
      </Link>

      <Button
        label={t("Se connecter")}
        onPress={handleSubmit}
        loading={isLoading}
        disabled={!email || !password}
        style={{ marginTop: spacing.md }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("Pas encore de compte ?")}</Text>
        <Link href="/(auth)/register">
          <Text style={styles.footerLink}> {t("Créer un compte")}</Text>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: spacing.xxxl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  forgotLink: { ...typography.captionMedium, color: colors.primary, textAlign: "right", marginBottom: spacing.lg },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xxl },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.bodyMedium, color: colors.primary },
});
