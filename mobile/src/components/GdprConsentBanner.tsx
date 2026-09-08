import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { getConsent, setConsent } from "@/api/consentStorage";
import { useAppSelector } from "@/store/hooks";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

export function GdprConsentBanner() {
  const insets = useSafeAreaInsets();
  const user = useAppSelector((state) => state.auth.user);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let isCurrent = true;
    if (!user) {
      setIsVisible(false);
      return () => {
        isCurrent = false;
      };
    }

    getConsent(user.id).then((consent) => {
      if (isCurrent) setIsVisible(!consent);
    });
    return () => {
      isCurrent = false;
    };
  }, [user]);

  const handleChoice = async (choice: "accepted" | "declined") => {
    setIsVisible(false);
    if (user) await setConsent(user.id, choice);
  };

  if (!isVisible) return null;

  return (
    <View style={[styles.container, { bottom: insets.bottom + spacing.sm }]}>
      <Text style={styles.title}>{t("Protection de vos données")}</Text>
      <Text style={styles.description}>
        {t("KOUROU AI utilise vos données uniquement pour fournir ses services de préparation")}
        {t("aux concours, conformément au RGPD. Vous pouvez accepter ou refuser ce traitement, puis modifier votre choix à tout moment.")}
      </Text>
      <Pressable onPress={() => router.push("/privacy-policy")} accessibilityRole="link">
        <Text style={styles.policyLink}>{t("Consulter la politique de confidentialité")}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Refuser le consentement RGPD")}
          onPress={() => handleChoice("declined")}
          style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}
        >
          <Text style={styles.declineLabel}>{t("Refuser")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Accepter le consentement RGPD")}
          onPress={() => handleChoice("accepted")}
          style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
        >
          <Text style={styles.acceptLabel}>{t("Accepter")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    ...shadows.floating,
    zIndex: 10,
  },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  description: { ...typography.caption, color: colors.textSecondary },
  policyLink: { ...typography.captionMedium, color: colors.primary, marginTop: spacing.sm },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md },
  declineButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md },
  acceptButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  declineLabel: { ...typography.bodyMedium, color: colors.primary },
  acceptLabel: { ...typography.bodyMedium, color: colors.white },
  pressed: { opacity: 0.75 },
});