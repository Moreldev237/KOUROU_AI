import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useConfirmPasswordResetMutation, useRequestPasswordResetMutation } from "@/store/api/authApi";
import { colors, spacing, typography } from "@/theme";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [requestReset, { isLoading: isRequesting, error: requestError }] = useRequestPasswordResetMutation();
  const [confirmReset, { isLoading: isConfirming, error: confirmError }] = useConfirmPasswordResetMutation();

  const handleRequest = async () => {
    await requestReset({ email: email.trim() }).unwrap().catch(() => {});
    setStep("confirm");
  };

  const handleConfirm = async () => {
    try {
      await confirmReset({ email: email.trim(), code, new_password: newPassword }).unwrap();
      router.replace("/(auth)/login");
    } catch {
      // erreur affichée via ErrorBanner
    }
  };

  const isValidEmail = email.includes("@") && email.includes(".");

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          {step === "request"
            ? "Indiquez l'adresse e-mail associée à votre compte."
            : "Saisissez le code reçu par e-mail et votre nouveau mot de passe."}
        </Text>
      </View>

      <ErrorBanner error={step === "request" ? requestError : confirmError} />

      <TextField
        label="Adresse e-mail"
        placeholder="vous@exemple.com"
        autoCapitalize="none"
        keyboardType="email-address"
        editable={step === "request"}
        value={email}
        onChangeText={setEmail}
      />

      {step === "request" ? (
        <Button
          label="Recevoir le code"
          onPress={handleRequest}
          loading={isRequesting}
          disabled={!isValidEmail}
        />
      ) : (
        <>
          <TextField
            label="Code reçu par e-mail"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TextField
            label="Nouveau mot de passe"
            placeholder="8 caractères minimum"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Button
            label="Réinitialiser le mot de passe"
            onPress={handleConfirm}
            loading={isConfirming}
            disabled={code.length !== 6 || newPassword.length < 8}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary },
});
