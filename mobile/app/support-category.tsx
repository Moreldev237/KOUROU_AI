import { useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInitiatePaymentMutation } from "@/store/api/paymentsApi";
import { colors, radii, spacing, typography } from "@/theme";
import type { SubscriptionPlan } from "@/types";
import { useLanguage } from "@/i18n";

export default function SupportCategoryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; cover?: string; plans?: string }>();
  const { t } = useLanguage();
  const [initiatePayment, { isLoading: isInitiating }] = useInitiatePaymentMutation();
  const [initiatingPlanId, setInitiatingPlanId] = useState<number | null>(null);

  const category = params.category ?? t("Supports de préparation");
  const cover = params.cover ?? "";
  const plans = useMemo<SubscriptionPlan[]>(() => {
    try {
      return params.plans ? JSON.parse(params.plans) as SubscriptionPlan[] : [];
    } catch {
      return [];
    }
  }, [params.plans]);

  const getSupportKind = (plan: SubscriptionPlan) => {
    const text = `${plan.name} ${plan.description}`.toLowerCase();
    return text.includes("épreuve") || text.includes("epreuve") || text.includes("corrig")
      ? t("Anciennes épreuves & corrigés")
      : t("Bord de préparation");
  };

  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    setInitiatingPlanId(plan.id);
    try {
      const transaction = await initiatePayment({ plan: plan.id }).unwrap();
      if (transaction.payment_url) {
        router.push({ pathname: "/payment-webview", params: { url: transaction.payment_url } });
      }
    } finally {
      setInitiatingPlanId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.huge }}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("Retour")}>
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>{t("Retour")}</Text>
      </Pressable>

      <ImageBackground source={cover ? { uri: cover } : require("@/../assets/icon.png")} style={styles.cover} imageStyle={styles.coverImage} resizeMode="cover">
        <View style={styles.coverOverlay}>
          <Ionicons name="school-outline" size={27} color={colors.white} />
          <Text style={styles.coverTitle}>{category}</Text>
          <Text style={styles.coverSubtitle}>{plans.length} {t("support(s) disponible(s)")}</Text>
        </View>
      </ImageBackground>

      <Text style={styles.pageTitle}>{t("Supports de préparation")}</Text>
      <Text style={styles.intro}>{t("Choisissez un bord de préparation ou des anciennes épreuves corrigées pour ce domaine.")}</Text>

      {plans.map((plan) => (
        <View key={plan.id} style={styles.planCard}>
          <View style={styles.kindBadge}><Text style={styles.kindText}>{getSupportKind(plan)}</Text></View>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{plan.price_fcfa.toLocaleString("fr-FR")} FCFA</Text>
          </View>
          <Text style={styles.planDescription}>{plan.description}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Ionicons name="document-text-outline" size={14} color={colors.textSecondary} /><Text style={styles.metaText}>{t("Accès numérique")}</Text></View>
            <View style={styles.metaChip}><Ionicons name="time-outline" size={14} color={colors.textSecondary} /><Text style={styles.metaText}>{plan.duration_days} {t("jours")}</Text></View>
          </View>
          <Pressable style={({ pressed }) => [styles.buyButton, pressed && styles.pressed]} onPress={() => handleChoosePlan(plan)} disabled={isInitiating}>
            {isInitiating && initiatingPlanId === plan.id ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="cart-outline" size={18} color={colors.white} /><Text style={styles.buyText}>{t("Acheter ce support")}</Text></>}
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  backButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", minHeight: 42, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  backText: { ...typography.bodyMedium, color: colors.primary },
  cover: { width: "100%", aspectRatio: 1.45, minHeight: 170, borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.primaryDark, marginBottom: spacing.xl },
  coverImage: { borderRadius: radii.lg },
  coverOverlay: { flex: 1, backgroundColor: "rgba(18,43,110,0.62)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  coverTitle: { ...typography.h1, color: colors.white, textAlign: "center", marginTop: spacing.sm },
  coverSubtitle: { ...typography.body, color: "rgba(255,255,255,0.82)", marginTop: spacing.xs },
  pageTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  intro: { ...typography.body, color: colors.textSecondary, lineHeight: 23, marginBottom: spacing.xl },
  planCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  kindBadge: { alignSelf: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3, marginBottom: spacing.sm },
  kindText: { ...typography.tiny, color: colors.primary },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  planName: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  planPrice: { ...typography.bodyMedium, color: colors.primary, textAlign: "right" },
  planDescription: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 21 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  metaChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.background, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  metaText: { ...typography.tiny, color: colors.textSecondary },
  buyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, backgroundColor: colors.primary, borderRadius: radii.md, marginTop: spacing.lg },
  buyText: { ...typography.bodyMedium, color: colors.white },
  pressed: { opacity: 0.75 },
});
