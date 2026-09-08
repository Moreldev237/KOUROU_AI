import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme";
import { BrandMark } from "@/components/BrandMark";
import { useLanguage } from "@/i18n";

const sections = [
  ["Responsable du traitement", "KOUROU AI. Contact : kourouai237@gmail.com. Téléphone et WhatsApp : MTN 683591916, Orange 686865451."],
  ["Données traitées", "Nous collectons uniquement les informations utiles au fonctionnement de votre espace : identité, coordonnées, concours choisi, progression, échanges avec le tuteur et documents que vous décidez d’importer."],
  ["Finalités", "Ces informations nous permettent de sécuriser votre compte, personnaliser votre préparation, conserver votre progression, gérer les quotas et confirmer vos accès."],
  ["Une IA entraînée et encadrée", "Kourou AI utilise une intelligence artificielle entraînée pour accompagner les révisions. Elle répond aux demandes formulées dans l’application : elle n’agit pas de manière autonome, ne prend pas de décision à votre place et ne lance aucune action sans votre demande."],
  ["Réponses responsables", "Une réponse générée peut être imparfaite. Utilisez Kourou AI comme un assistant de préparation et vérifiez les informations importantes avec vos cours et les sources officielles."],
  ["Services techniques", "Certaines données strictement nécessaires peuvent être traitées par des prestataires techniques de confiance afin d’assurer l’IA, les paiements, l’hébergement et la sécurité du service. Nous ne publions pas vos informations et ne vendons pas vos données personnelles."],
  ["Paiements", "Les paiements sont traités par un service spécialisé. KOUROU AI ne stocke pas votre code PIN Mobile Money et conserve uniquement les informations nécessaires au suivi de la transaction et de l’abonnement."],
  ["Vos droits", "Vous pouvez demander l'accès, la rectification, l'effacement, la limitation ou la portabilité de vos données, selon la réglementation applicable. Contact : kourouai237@gmail.com ou WhatsApp 686865451."],
  ["Suppression du compte", "Pour demander la suppression de votre compte, contactez le responsable à l'adresse kourouai237@gmail.com ou par WhatsApp au 686865451. Certaines données peuvent être conservées lorsque la loi l'impose."],
];
const POLICY_VERSION = "1.1";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [openPromise, setOpenPromise] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.huge }}>
      <BrandMark />
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("Politique de confidentialité")}</Text>
          <Text style={styles.updated}>{t("Dernière mise à jour : 5 septembre 2026")} · v{POLICY_VERSION}</Text>
        </View>
        <Ionicons name="close" size={24} color={colors.textSecondary} onPress={() => router.back()} />
      </View>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="lock-closed" size={18} color={colors.white} />
        </View>
        <Text style={styles.heroTitle}>{t("Votre préparation reste entre de bonnes mains.")}</Text>
        <Text style={styles.heroText}>{t("Nous protégeons les informations nécessaires à votre expérience et nous vous expliquons l’essentiel, sans jargon inutile.")}</Text>
      </View>
      <View style={styles.promiseRow}>
        <Promise icon="eye-off-outline" title={t("Discrétion")} text={t("Vos données ne sont pas publiées.")} active={openPromise === "discretion"} onPress={() => setOpenPromise(openPromise === "discretion" ? null : "discretion")} />
        <Promise icon="sparkles-outline" title={t("IA encadrée")} text={t("Elle répond à vos demandes.")} active={openPromise === "ai"} onPress={() => setOpenPromise(openPromise === "ai" ? null : "ai")} />
        <Promise icon="shield-checkmark-outline" title={t("Contrôle")} text={t("Vous gardez vos droits.")} active={openPromise === "control"} onPress={() => setOpenPromise(openPromise === "control" ? null : "control")} />
      </View>
      {openPromise ? <Text style={styles.promiseDetail}>{t(openPromise === "discretion" ? "Nous ne vendons pas vos données personnelles et nous ne les publions pas." : openPromise === "ai" ? "Notre IA répond uniquement aux demandes formulées dans l’application." : "Vous pouvez demander l’accès, la rectification ou la suppression de vos données.")}</Text> : null}
      {sections.map(([title, text]) => (
        <View key={title} style={styles.section}>
          <Text style={styles.sectionTitle}>{t(title)}</Text>
          <Text style={styles.sectionText}>{t(text)}</Text>
        </View>
      ))}
      <View style={styles.faqBlock}>
        <Text style={styles.sectionTitle}>{t("Questions fréquentes sur la confidentialité")}</Text>
        <PrivacyQuestion question={t("Mes données sont-elles vendues ?")} answer={t("Non. KOUROU AI ne vend pas vos données personnelles.")} open={openQuestion === "sold"} onPress={() => setOpenQuestion(openQuestion === "sold" ? null : "sold")} />
        <PrivacyQuestion question={t("L’IA agit-elle seule ?")} answer={t("Non. Elle répond à vos demandes et ne prend pas d’initiative autonome dans l’application.")} open={openQuestion === "autonomous"} onPress={() => setOpenQuestion(openQuestion === "autonomous" ? null : "autonomous")} />
        <PrivacyQuestion question={t("Comment demander la suppression de mon compte ?")} answer={t("Écrivez à kourouai237@gmail.com ou contactez-nous sur WhatsApp au 686865451.")} open={openQuestion === "delete"} onPress={() => setOpenQuestion(openQuestion === "delete" ? null : "delete")} />
      </View>
      <Text style={styles.supportNote}>{t("Support : réponses habituelles du lundi au samedi, de 8 h à 18 h.")}</Text>
    </ScrollView>
  );
}

function Promise({ icon, title, text, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.promise, active && styles.promiseActive]} onPress={onPress}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <Text style={styles.promiseTitle}>{title}</Text>
      <Text style={styles.promiseText}>{text}</Text>
    </Pressable>
  );
}

function PrivacyQuestion({ question, answer, open, onPress }: { question: string; answer: string; open: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.question} onPress={onPress}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionTitle}>{question}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.primary} />
      </View>
      {open ? <Text style={styles.questionAnswer}>{answer}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  headerCopy: { flex: 1 },
  title: { ...typography.h2, color: colors.textPrimary },
  updated: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  intro: { ...typography.body, color: colors.textSecondary, lineHeight: 23, marginBottom: spacing.xl },
  hero: { backgroundColor: colors.primaryDark, borderRadius: radii.xl, padding: spacing.xl, marginBottom: spacing.lg },
  heroIcon: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  heroTitle: { ...typography.h2, color: colors.white, marginBottom: spacing.sm },
  heroText: { ...typography.body, color: "rgba(255,255,255,0.82)", lineHeight: 23 },
  promiseRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xxl },
  promise: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  promiseActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  promiseTitle: { ...typography.captionMedium, color: colors.textPrimary, marginTop: spacing.sm },
  promiseText: { ...typography.tiny, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  promiseDetail: { ...typography.caption, color: colors.textSecondary, backgroundColor: colors.primarySoft, borderRadius: radii.sm, padding: spacing.md, marginTop: -spacing.lg, marginBottom: spacing.xxl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  sectionText: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
  faqBlock: { marginTop: spacing.sm, marginBottom: spacing.xl },
  question: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  questionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  questionTitle: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1 },
  questionAnswer: { ...typography.caption, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.sm },
  supportNote: { ...typography.caption, color: colors.primaryDark, backgroundColor: colors.primarySoft, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.lg },
  notice: { ...typography.caption, color: colors.warning, backgroundColor: `${colors.warning}18`, borderRadius: radii.sm, padding: spacing.md },
});
