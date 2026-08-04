import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ErrorBanner";
import { useGetMySubscriptionQuery, useInitiatePaymentMutation, useListPlansQuery } from "@/store/api/paymentsApi";
import { colors, radii, spacing, typography } from "@/theme";
import type { SubscriptionPlan } from "@/types";

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { data: plans, isLoading: loadingPlans } = useListPlansQuery();
  const { data: subscription } = useGetMySubscriptionQuery();
  const [initiatePayment, { isLoading: isInitiating, error }] = useInitiatePaymentMutation();

  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    try {
      const transaction = await initiatePayment({ plan: plan.id }).unwrap();
      if (transaction.payment_url) {
        router.push({ pathname: "/payment-webview", params: { url: transaction.payment_url } });
      }
    } catch {
      // erreur affichée via ErrorBanner
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.xxl, paddingBottom: spacing.huge }}
    >
      <Text style={styles.title}>Abonnement</Text>

      {subscription ? (
        <View style={styles.activeCard}>
          <Ionicons name="checkmark-circle" size={24} color={colors.white} />
          <Text style={styles.activeCardTitle}>{subscription.plan_name}</Text>
          <Text style={styles.activeCardSubtitle}>
            Actif jusqu&apos;au {new Date(subscription.end_date).toLocaleDateString("fr-FR")}
          </Text>
        </View>
      ) : (
        <View style={styles.freeCard}>
          <Text style={styles.freeCardTitle}>Compte gratuit</Text>
          <Text style={styles.freeCardSubtitle}>
            Passez à un forfait illimité pour vous entraîner sans limite quotidienne.
          </Text>
        </View>
      )}

      <ErrorBanner error={error} />

      <Text style={styles.sectionTitle}>Nos formules</Text>

      {loadingPlans ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        plans?.results.map((plan) => (
          <View key={plan.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{plan.price_fcfa.toLocaleString("fr-FR")} FCFA</Text>
            </View>
            <Text style={styles.planDescription}>{plan.description}</Text>
            <View style={styles.planMetaRow}>
              <View style={styles.planMetaChip}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.planMetaText}>{plan.duration_days} jours</Text>
              </View>
              {plan.exam_name && (
                <View style={styles.planMetaChip}>
                  <Ionicons name="school-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.planMetaText}>{plan.exam_name}</Text>
                </View>
              )}
            </View>
            <Pressable
              style={styles.chooseButton}
              onPress={() => handleChoosePlan(plan)}
              disabled={isInitiating}
            >
              {isInitiating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.chooseButtonText}>Payer par Mobile Money</Text>
              )}
            </Pressable>
          </View>
        ))
      )}

      <Text style={styles.disclaimer}>
        Paiement sécurisé via MTN Mobile Money et Orange Money. Vos privilèges sont activés dès la confirmation du
        paiement.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  activeCard: {
    backgroundColor: colors.accentGreen,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  activeCardTitle: { ...typography.h3, color: colors.white, marginTop: spacing.xs },
  activeCardSubtitle: { ...typography.caption, color: "rgba(255,255,255,0.9)" },
  freeCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xl },
  freeCardTitle: { ...typography.h3, color: colors.textPrimary },
  freeCardSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  planName: { ...typography.h3, color: colors.textPrimary },
  planPrice: { ...typography.h3, color: colors.primary },
  planDescription: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  planMetaRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  planMetaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.background, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  planMetaText: { ...typography.tiny, color: colors.textSecondary },
  chooseButton: { height: 46, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  chooseButtonText: { ...typography.captionMedium, color: colors.white },
  disclaimer: { ...typography.caption, color: colors.textTertiary, textAlign: "center", marginTop: spacing.lg },
});
