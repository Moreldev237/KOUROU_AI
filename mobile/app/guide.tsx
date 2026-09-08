import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme";
import { useLanguage } from "@/i18n";

const steps = [
  {
    icon: "school-outline" as const,
    title: "Choisissez votre concours",
    text: "Sélectionnez le concours visé, puis la matière et le niveau de difficulté qui correspondent à votre préparation.",
  },
  {
    icon: "sparkles-outline" as const,
    title: "Entraînez-vous avec l'IA",
    text: "Lancez une série de QCM ou posez vos questions à Kourou AI. Les questions sont adaptées au programme sélectionné.",
  },
  {
    icon: "trending-up-outline" as const,
    title: "Mesurez vos progrès",
    text: "Répondez, consultez vos corrections et suivez vos scores, vos sessions et votre régularité depuis l'accueil.",
  },
];

const benefits = [
  "Générations de QCM sans limite pendant la période active",
  "Accès plus confortable pour réviser régulièrement",
  "Formules générales ou dédiées à un concours selon l'offre",
  "Activation automatique après confirmation du paiement",
];

const productOptions = [
  {
    icon: "person-outline" as const,
    title: "Compte gratuit",
    text: "Découvrez les QCM et Kourou AI avec un quota quotidien, sans paiement.",
  },
  {
    icon: "star-outline" as const,
    title: "Premium",
    text: "Révisez sans limite avec une formule mensuelle ou trimestrielle sur tous les concours.",
  },
  {
    icon: "ribbon-outline" as const,
    title: "Packs concours",
    text: "Choisissez un accès ponctuel et ciblé pour préparer un concours précis.",
  },
];

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.huge }}
    >
      <View style={styles.topBar}>
        <View style={styles.brandMark}>
          <Ionicons name="sparkles" size={19} color={colors.white} />
        </View>
        <View style={styles.topBarCopy}>
          <Text style={styles.eyebrow}>{t("BIENVENUE SUR KOUROU AI")}</Text>
          <Text style={styles.title}>{t("Votre préparation, mieux organisée.")}</Text>
        </View>
        <Ionicons name="close" size={24} color={colors.textSecondary} onPress={() => router.back()} />
      </View>

      <Text style={styles.intro}>
        {t("Kourou AI vous aide à transformer chaque session en progrès concret, du premier entraînement jusqu'au jour du concours.")}
      </Text>

      <View style={styles.highlight}>
        <View style={styles.highlightIcon}>
          <Ionicons name="rocket-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.highlightCopy}>
          <Text style={styles.highlightTitle}>{t("Le bon rythme, au bon moment")}</Text>
          <Text style={styles.highlightText}>{t("Travaillez une notion, vérifiez vos acquis et revenez sur vos erreurs.")}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t("Comment ça marche ?")}</Text>
      <View style={styles.stepsList}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              {index < steps.length - 1 ? <View style={styles.railLine} /> : null}
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepTitleRow}>
                <Ionicons name={step.icon} size={20} color={colors.primary} />
                <Text style={styles.stepTitle}>{t(step.title)}</Text>
              </View>
              <Text style={styles.stepText}>{t(step.text)}</Text>
            </View>
          </View>
        ))}
      </View>

     

      <Text style={styles.sectionTitle}>{t("Choisissez votre formule")}</Text>
      <View style={styles.optionsBlock}>
        {productOptions.map((option) => (
          <View key={option.title} style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>{t(option.title)}</Text>
              <Text style={styles.optionText}>{t(option.text)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.benefitsBlock}>
        <Text style={styles.benefitsTitle}>{t("Ce que vous gagnez avec une souscription")}</Text>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={19} color={colors.accentGreen} />
            <Text style={styles.benefitText}>{t(benefit)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.referralBlock}>
        <View style={styles.referralIcon}><Ionicons name="people-outline" size={22} color={colors.white} /></View>
        <View style={styles.referralCopy}>
          <Text style={styles.referralTitle}>{t("Invitez un autre candidat")}</Text>
          <Text style={styles.referralText}>
            {t("Partagez votre e-mail ou votre numéro comme parrain lors de son inscription. Quand votre filleul souscrit et que le paiement est confirmé, vous recevez un bonus de 5 unités de quota.")}
          </Text>
        </View>
      </View>

      <View style={styles.reminderBlock}>
        <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        <View style={styles.reminderCopy}>
          <Text style={styles.reminderTitle}>{t("Gardez votre rythme")}</Text>
          <Text style={styles.reminderText}>{t("Activez le rappel quotidien depuis votre profil pour ne pas interrompre votre préparation.")}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t("Souscrire en toute simplicité")}</Text>
      <View style={styles.paymentSteps}>
        <PaymentStep icon="list-outline" text={t("Ouvrez l'onglet Abonnement et choisissez la formule adaptée.")} />
        <PaymentStep icon="phone-portrait-outline" text={t("Payez par MTN Mobile Money ou Orange Money via le parcours sécurisé.")} />
        <PaymentStep icon="checkmark-done-outline" text={t("Après confirmation, vos privilèges Premium sont activés automatiquement.")} />
      </View>

      <Text style={styles.footer}>{t("Une question ? Utilisez Kourou AI pour demander une explication sur votre concours ou votre préparation.")}</Text>
    </ScrollView>
  );
}

function PaymentStep({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.paymentRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.paymentText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  brandMark: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  topBarCopy: { flex: 1 },
  eyebrow: { ...typography.tiny, color: colors.primary, letterSpacing: 0.8, marginBottom: 2 },
  title: { ...typography.h2, color: colors.textPrimary },
  intro: { ...typography.body, color: colors.textSecondary, lineHeight: 23, marginBottom: spacing.xl },
  highlight: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: `${colors.accentSky}18`, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xxl },
  highlightIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  highlightCopy: { flex: 1 },
  highlightTitle: { ...typography.bodyMedium, color: colors.primaryDark },
  highlightText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  stepsList: { marginBottom: spacing.xxl },
  stepRow: { flexDirection: "row", minHeight: 84 },
  stepRail: { width: 34, alignItems: "center" },
  stepNumber: { width: 28, height: 28, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stepNumberText: { ...typography.captionMedium, color: colors.white },
  railLine: { flex: 1, width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  stepContent: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.lg },
  stepTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  stepTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  stepText: { ...typography.caption, color: colors.textSecondary, lineHeight: 19 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  comparison: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  comparisonColumn: { flex: 1 },
  divider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  comparisonLabel: { ...typography.tiny, color: colors.textSecondary, marginBottom: spacing.xs },
  comparisonLabelPremium: { ...typography.tiny, color: colors.accentGreen, marginBottom: spacing.xs },
  comparisonTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: spacing.xs },
  comparisonText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  optionsBlock: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xxl },
  optionRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.md },
  optionIcon: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  optionCopy: { flex: 1 },
  optionTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: 2 },
  optionText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  benefitsBlock: { backgroundColor: colors.primaryDark, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xxl },
  benefitsTitle: { ...typography.bodyMedium, color: colors.white, marginBottom: spacing.md },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.sm },
  benefitText: { ...typography.caption, color: "rgba(255,255,255,0.9)", flex: 1, lineHeight: 19 },
  referralBlock: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.accentGreen, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.xxl },
  referralIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  referralCopy: { flex: 1 },
  referralTitle: { ...typography.bodyMedium, color: colors.white, marginBottom: spacing.xs },
  referralText: { ...typography.caption, color: "rgba(255,255,255,0.95)", lineHeight: 19 },
  reminderBlock: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xxl },
  reminderCopy: { flex: 1 },
  reminderTitle: { ...typography.bodyMedium, color: colors.primaryDark, marginBottom: 2 },
  reminderText: { ...typography.caption, color: colors.textSecondary, lineHeight: 19 },
  paymentSteps: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  paymentRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.sm },
  paymentText: { ...typography.body, color: colors.textSecondary, flex: 1, lineHeight: 21 },
  footer: { ...typography.caption, color: colors.textTertiary, textAlign: "center", lineHeight: 19, paddingHorizontal: spacing.md },
});
