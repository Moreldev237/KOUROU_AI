import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ErrorBanner";
import { useGetMySubscriptionQuery, useInitiatePaymentMutation, useListPlansQuery, useListUnlockedPacksQuery } from "@/store/api/paymentsApi";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import type { SubscriptionPlan } from "@/types";
import { useLanguage } from "@/i18n";

const testimonials = [
  {
    exam: "Concours ENAM",
    result: "Préparation plus régulière",
    quote: "Les corrections détaillées m'ont aidé à comprendre mes erreurs et à mieux cibler mes révisions.",
    name: "Aïcha, candidate ENAM",
  },
  {
    exam: "Concours Police",
    result: "Objectifs suivis chaque semaine",
    quote: "Avec les QCM ciblés, j'ai pu m'entraîner rapidement même quand je n'avais que quelques minutes.",
    name: "Moussa, candidat Police",
  },
  {
    exam: "Préparation générale",
    result: "Révisions mieux organisées",
    quote: "Le tuteur m'a permis de reprendre les notions difficiles au lieu de réviser au hasard.",
    name: "Grâce, candidate aux concours",
  },
];
const testimonialCardWidth = 300;
const testimonialStep = testimonialCardWidth + spacing.md;

const GENERIC_CATEGORY_COVERS = [
  { keywords: ["gendar", "police", "militaire", "sécurité", "securite", "défense", "defense"], url: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=1600&q=85" },
  { keywords: ["enam", "administr", "magistr", "droit", "financ", "trésor", "tresor"], url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=85" },
  { keywords: ["agric", "elevage", "élevage", "rural", "forêt", "foret", "vétér", "veter"], url: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=1600&q=85" },
  { keywords: ["santé", "sante", "infirm", "médec", "medec", "soignant", "pharmac"], url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=85" },
  { keywords: ["télécom", "telecom", "informat", "numérique", "numerique", "technique", "réseau", "reseau"], url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=85" },
  { keywords: ["enseignement", "ens", "éducation", "education", "jeunesse", "injs", "cenajes", "professeur"], url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=85" },
] as const;

const DEFAULT_CATEGORY_COVER = "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1600&q=85";

function getCategoryCover(category: string, configuredUrl?: string | null) {
  if (configuredUrl) return configuredUrl;
  const normalized = category.toLowerCase();
  return GENERIC_CATEGORY_COVERS.find((cover) => cover.keywords.some((keyword) => normalized.includes(keyword)))?.url ?? DEFAULT_CATEGORY_COVER;
}

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { data: plans, isLoading: loadingPlans } = useListPlansQuery();
  const { data: subscription } = useGetMySubscriptionQuery();
  const { data: unlockedPacks } = useListUnlockedPacksQuery();
  const [initiatePayment, { isLoading: isInitiating, error }] = useInitiatePaymentMutation();
  const [initiatingPlanId, setInitiatingPlanId] = useState<number | null>(null);
  const [failedCategoryCovers, setFailedCategoryCovers] = useState<Record<string, boolean>>({});
  const [supportSearch, setSupportSearch] = useState("");
  const [supportKindFilter, setSupportKindFilter] = useState<"all" | "guide" | "papers">("all");
  const [supportPage, setSupportPage] = useState(1);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const testimonialsRef = useRef<ScrollView>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    const autoplay = setInterval(() => {
      setActiveTestimonial((currentIndex) => {
        const nextIndex = (currentIndex + 1) % testimonials.length;
        testimonialsRef.current?.scrollTo({
          x: nextIndex * testimonialStep,
          animated: nextIndex !== 0,
        });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(autoplay);
  }, []);

  const premiumPlans = plans?.results.filter((plan) => plan.billing_cycle === "monthly") ?? [];
  const examPacks = plans?.results.filter((plan) => plan.billing_cycle === "one_time") ?? [];
  const supportGroups = examPacks.reduce<Record<string, SubscriptionPlan[]>>((groups, plan) => {
    const category = plan.exam_category || plan.exam_name || t("Tous les concours");
    (groups[category] ??= []).push(plan);
    return groups;
  }, {});

  const categoryCovers = Object.entries(supportGroups).reduce<Record<string, string>>((covers, [category, categoryPlans]) => {
    covers[category] = getCategoryCover(category, categoryPlans.find((plan) => plan.exam_cover_image)?.exam_cover_image);
    return covers;
  }, {});

  const getSupportKind = (plan: SubscriptionPlan) => {
    const text = `${plan.name} ${plan.description}`.toLowerCase();
    return text.includes("épreuve") || text.includes("epreuve") || text.includes("corrig")
      ? t("Anciennes épreuves & corrigés")
      : t("Bord de préparation");
  };

  const filteredSupportGroups = Object.entries(supportGroups).filter(([category, categoryPlans]) => {
    const categoryMatches = category.toLowerCase().includes(supportSearch.toLowerCase());
    const matchingPlans = categoryPlans.filter((plan) => {
      const text = `${plan.name} ${plan.description}`.toLowerCase();
      const searchMatches = text.includes(supportSearch.toLowerCase());
      const kindMatches = supportKindFilter === "all" || (supportKindFilter === "papers" ? getSupportKind(plan) === t("Anciennes épreuves & corrigés") : getSupportKind(plan) === t("Bord de préparation"));
      return searchMatches && kindMatches;
    });
    return (categoryMatches || matchingPlans.length > 0) && matchingPlans.length > 0;
  });
  const supportPageSize = 4;
  const supportPageCount = Math.max(1, Math.ceil(filteredSupportGroups.length / supportPageSize));
  const visibleSupportGroups = filteredSupportGroups.slice((supportPage - 1) * supportPageSize, supportPage * supportPageSize);

  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    setInitiatingPlanId(plan.id);
    try {
      const transaction = await initiatePayment({ plan: plan.id }).unwrap();
      if (transaction.payment_url) {
        router.push({ pathname: "/payment-webview", params: { url: transaction.payment_url } });
      }
    } catch {
      // erreur affichée via ErrorBanner
    } finally {
      setInitiatingPlanId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.huge }}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>{t("KOUROU AI · ACCÈS")}</Text>
        <Text style={styles.title}>{t("Choisissez votre accès")}</Text>
      </View>
      <Text style={styles.helperText}>
        {t("Sélectionnez le forfait qui correspond à votre objectif d’entraînement et profitez d’un accès premium sans limite.")}
      </Text>
      <Pressable style={styles.guideLink} onPress={() => router.push("/guide")}>
        <Ionicons name="help-circle-outline" size={19} color={colors.primary} />
        <Text style={styles.guideLinkText}>{t("Comprendre les avantages et le fonctionnement")}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>

      {subscription ? (
        <View style={styles.activeCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}><Ionicons name="checkmark" size={18} color={colors.accentGreen} /></View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusLabel}>{t("ABONNEMENT ACTIF")}</Text>
              <Text style={styles.activeCardTitle}>{subscription.plan_name}</Text>
            </View>
          </View>
          <Text style={styles.activeCardSubtitle}>
            {t("Actif jusqu'au")} {new Date(subscription.end_date).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")}
          </Text>
        </View>
      ) : (
        <View style={styles.freeCard}>
          <View style={styles.freeIcon}><Ionicons name="sparkles-outline" size={19} color={colors.primary} /></View>
          <View style={styles.freeCopy}>
            <Text style={styles.freeCardTitle}>{t("Compte gratuit")}</Text>
          <Text style={styles.freeCardSubtitle}>
            {t("Passez à un forfait illimité pour vous entraîner sans limite quotidienne.")}
          </Text>
          </View>
        </View>
      )}

      <ErrorBanner error={error} />

      <View style={styles.trustBanner}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.accentGreen} />
        <Text style={styles.trustBannerText}>{t("Paiement sécurisé via MTN Mobile Money et Orange Money. Votre accès est activé automatiquement après confirmation.")}</Text>
      </View>

      <View style={styles.modelCard}>
        <Text style={styles.modelTitle}>{t("Notre modèle : Freemium + Premium + Packs")}</Text>
        <View style={styles.modelRow}>
          <View style={styles.modelPill}>
            <Text style={styles.modelPillTitle}>{t("Gratuit")}</Text>
            <Text style={styles.modelPillText}>{t("Découverte")}</Text>
          </View>
          <View style={[styles.modelPill, styles.modelPillPremium]}>
            <Text style={styles.modelPillTitle}>Premium</Text>
            <Text style={styles.modelPillText}>{t("Accès illimité")}</Text>
          </View>
          <View style={styles.modelPill}>
            <Text style={styles.modelPillTitle}>Packs</Text>
            <Text style={styles.modelPillText}>{t("Concours ciblés")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>{t("Gratuit vs Premium")}</Text>
        <View style={styles.comparisonGrid}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonLabelFree}>{t("Gratuit")}</Text>
            <View style={styles.checkRow}><Ionicons name="close-circle" size={15} color={colors.error} /><Text style={styles.comparisonText}>{t("Quota limité")}</Text></View>
            <View style={styles.checkRow}><Ionicons name="close-circle" size={15} color={colors.error} /><Text style={styles.comparisonText}>{t("Accès partiel")}</Text></View>
            <View style={styles.checkRow}><Ionicons name="close-circle" size={15} color={colors.error} /><Text style={styles.comparisonText}>{t("Pas de packs premium")}</Text></View>
          </View>
          <View style={styles.comparisonColumnHighlight}>
            <Text style={styles.comparisonLabelPremium}>{t("Premium")}</Text>
            <View style={styles.checkRow}><Ionicons name="checkmark-circle" size={15} color={colors.accentGreen} /><Text style={styles.comparisonText}>{t("QCM illimités")}</Text></View>
            <View style={styles.checkRow}><Ionicons name="checkmark-circle" size={15} color={colors.accentGreen} /><Text style={styles.comparisonText}>{t("Corrections avancées")}</Text></View>
            <View style={styles.checkRow}><Ionicons name="checkmark-circle" size={15} color={colors.accentGreen} /><Text style={styles.comparisonText}>{t("Supports inclus")}</Text></View>
          </View>
        </View>
      </View>

      <View style={styles.testimonialsSection}>
        <View style={styles.testimonialsHeader}>
          <View style={styles.testimonialsHeadingCopy}>
            <Text style={styles.sectionTitle}>{t("Ils préparent leur concours avec Kourou AI")}</Text>
            <Text style={styles.testimonialsNote}>{t("Témoignages de démonstration")}</Text>
          </View>
          <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
        </View>
        <ScrollView
          ref={testimonialsRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.testimonialsCarousel}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / testimonialStep);
            setActiveTestimonial(Math.min(index, testimonials.length - 1));
          }}
        >
          {testimonials.map((testimonial) => (
            <View key={testimonial.name} style={styles.testimonialCard}>
              <View style={styles.testimonialTopRow}>
                <View style={styles.examTag}>
                  <Ionicons name="school-outline" size={14} color={colors.primary} />
                  <Text style={styles.examTagText}>{testimonial.exam}</Text>
                </View>
                <Text style={styles.testimonialStars}>★★★★★</Text>
              </View>
              <Text style={styles.testimonialResult}>{testimonial.result}</Text>
              <Text style={styles.testimonialQuote}>“{testimonial.quote}”</Text>
              <Text style={styles.testimonialName}>{testimonial.name}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.carouselDots}>
          {testimonials.map((testimonial, index) => (
            <View key={testimonial.exam} style={[styles.carouselDot, index === activeTestimonial && styles.carouselDotActive]} />
          ))}
        </View>
      </View>

      {unlockedPacks?.length ? (
        <View style={styles.packsSection}>
          <Text style={styles.sectionTitle}>{t("Mes supports de formation")}</Text>
          {unlockedPacks.map((pack) => (
            <View key={pack.id} style={styles.packCard}>
              <Text style={styles.packTitle}>{pack.plan_name}</Text>
              <Text style={styles.packDescription}>{pack.description}</Text>
              <Text style={styles.packExpiry}>{t("Accès jusqu'au")} {new Date(pack.access_until).toLocaleDateString(language === "en" ? "en-US" : "fr-FR")}</Text>
              <Pressable style={({ pressed }) => [styles.openPackButton, pressed && styles.pressed]} onPress={() => Linking.openURL(pack.google_drive_url)}>
                <Ionicons name="open-outline" size={18} color={colors.white} />
                <Text style={styles.openPackLabel}>{t("Ouvrir le support")}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t("Premium")}</Text>

      {loadingPlans ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        premiumPlans.map((plan, index) => {
          const isRecommended = plan.duration_days >= 90;
          const isMonthlyStarter = plan.duration_days < 90;

          return (
            <View key={plan.id} style={[styles.planCard, isRecommended && styles.recommendedPlanCard]}>
              {isRecommended ? (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>{t("Meilleur rapport qualité-prix")}</Text>
                </View>
              ) : null}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price_fcfa.toLocaleString("fr-FR")} FCFA</Text>
              </View>

              <Text style={styles.planDescription}>{plan.description}</Text>

              {isMonthlyStarter ? (
                <Text style={styles.offerPositioning}>{t("Pour commencer sans engagement long")}</Text>
              ) : (
                <Text style={styles.offerPositioning}>Économisez 1 500 FCFA par rapport à 3 mois au tarif mensuel</Text>
              )}

              <View style={styles.benefitsList}>
                <View style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
                  <Text style={styles.benefitText}>Accès illimité aux QCM et corrections</Text>
                </View>
                <View style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
                  <Text style={styles.benefitText}>{plan.duration_days} {t("jours d’utilisation premium")}</Text>
                </View>
                <View style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
                  <Text style={styles.benefitText}>{plan.exam_name ? `Spécialement conçu pour ${plan.exam_name}` : "Accès pour tous les concours"}</Text>
                </View>
              </View>

              <View style={styles.planMetaRow}>
                <View style={styles.planMetaChip}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.planMetaText}>{plan.duration_days} {t("jours")}</Text>
                </View>
                {plan.exam_name && (
                  <View style={styles.planMetaChip}>
                    <Ionicons name="school-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.planMetaText}>{plan.exam_name}</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [styles.chooseButton, isRecommended && styles.recommendedButton, pressed && styles.pressed]}
                onPress={() => handleChoosePlan(plan)}
                disabled={isInitiating}
              >
                {isInitiating && initiatingPlanId === plan.id ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.chooseButtonText}>{isMonthlyStarter ? t("Commencer au mois") : t("Choisir le meilleur prix")}</Text>
                )}
              </Pressable>
            </View>
          );
        })
      )}

      {examPacks.length > 0 ? (
        <>
          <View style={styles.supportsHeader}>
            <View style={styles.supportsHeaderIcon}><Ionicons name="library-outline" size={22} color={colors.primary} /></View>
            <View style={styles.supportsHeaderCopy}>
              <Text style={styles.sectionTitle}>{t("Supports de préparation")}</Text>
              <Text style={styles.supportsSubtitle}>{t("Bords de préparation, anciennes épreuves et corrigés classés par concours.")}</Text>
            </View>
          </View>
          <TextInput
            value={supportSearch}
            onChangeText={(value) => { setSupportSearch(value); setSupportPage(1); }}
            placeholder={t("Rechercher un concours ou un support")}
            placeholderTextColor={colors.textTertiary}
            style={styles.supportSearch}
          />
          <View style={styles.supportFilterRow}>
            {([["all", "Tous"], ["guide", "Bords"], ["papers", "Épreuves & corrigés"]] as const).map(([value, label]) => (
              <Pressable key={value} style={[styles.supportFilter, supportKindFilter === value && styles.supportFilterActive]} onPress={() => { setSupportKindFilter(value); setSupportPage(1); }}>
                <Text style={[styles.supportFilterText, supportKindFilter === value && styles.supportFilterTextActive]}>{t(label)}</Text>
              </Pressable>
            ))}
          </View>
          {visibleSupportGroups.map(([category, categoryPlans]) => (
            <View key={category} style={styles.categoryGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${category} ${t("Ouvrir les supports")}`}
                style={({ pressed }) => [styles.categoryCover, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/support-category", params: { category, cover: categoryCovers[category], plans: JSON.stringify(categoryPlans) } })}
              >
                <ImageBackground
                  source={failedCategoryCovers[category] ? require("@/../assets/icon.png") : { uri: categoryCovers[category] }}
                  style={styles.categoryCoverImageBackground}
                  imageStyle={styles.categoryCoverImage}
                  resizeMode="cover"
                  onError={() => setFailedCategoryCovers((current) => ({ ...current, [category]: true }))}
                >
                  <View style={styles.categoryCoverOverlay}>
                    <Text style={styles.categoryCoverEmoji}>🎓</Text>
                    <Text style={styles.categoryCoverLabel}>{category}</Text>
                    <View style={styles.coverActionHint}>
                      <Text style={styles.coverActionText}>{t("Ouvrir les supports")}</Text>
                      <Ionicons name="arrow-forward" size={17} color={colors.white} />
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>
            </View>
          ))}
          {supportPageCount > 1 ? (
            <View style={styles.paginationRow}>
              <Pressable disabled={supportPage === 1} onPress={() => setSupportPage((page) => Math.max(1, page - 1))} style={[styles.pageButton, supportPage === 1 && styles.pageButtonDisabled]}>
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
              </Pressable>
              <Text style={styles.pageLabel}>{supportPage} / {supportPageCount}</Text>
              <Pressable disabled={supportPage === supportPageCount} onPress={() => setSupportPage((page) => Math.min(supportPageCount, page + 1))} style={[styles.pageButton, supportPage === supportPageCount && styles.pageButtonDisabled]}>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      <Text style={styles.disclaimer}>
        {t("Paiement sécurisé via MTN Mobile Money et Orange Money. Vos privilèges sont activés dès la confirmation du paiement.")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pageHeader: { marginBottom: spacing.lg },
  eyebrow: { ...typography.tiny, color: colors.primary, letterSpacing: 0.8, marginBottom: spacing.xs },
  title: { ...typography.h1, color: colors.textPrimary },
  activeCard: {
    backgroundColor: colors.accentGreen,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.xs,
    ...shadows.card,
  },
  statusIcon: { width: 38, height: 38, borderRadius: radii.full, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  statusCopy: { flex: 1, minWidth: 0 },
  statusLabel: { ...typography.tiny, color: "rgba(255,255,255,0.82)", letterSpacing: 0.6 },
  activeCardTitle: { ...typography.h3, color: colors.white, marginTop: 2, flexShrink: 1 },
  activeCardSubtitle: { ...typography.caption, color: "rgba(255,255,255,0.9)" },
  freeCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  freeIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  freeCopy: { flex: 1, minWidth: 0 },
  freeCardTitle: { ...typography.h3, color: colors.textPrimary },
  freeCardSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  helperText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  guideLink: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: `${colors.accentSky}18`, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.xl },
  guideLinkText: { ...typography.captionMedium, color: colors.primary, flex: 1 },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  trustBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: `${colors.accentGreen}12`, borderRadius: radii.md, borderWidth: 1, borderColor: `${colors.accentGreen}40`, padding: spacing.md, marginBottom: spacing.lg },
  trustBannerText: { ...typography.caption, color: colors.textPrimary, flex: 1, lineHeight: 18 },
  comparisonCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xl, ...shadows.card },
  modelCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xl, ...shadows.card },
  modelTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  modelRow: { flexDirection: "row", gap: spacing.sm },
  modelPill: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modelPillPremium: { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}60` },
  modelPillTitle: { ...typography.captionMedium, color: colors.textPrimary, marginBottom: 2 },
  modelPillText: { ...typography.tiny, color: colors.textSecondary, textAlign: "center" },
  comparisonTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  comparisonGrid: { flexDirection: "row", gap: spacing.sm },
  comparisonColumn: { flex: 1, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.md },
  comparisonColumnHighlight: { flex: 1, backgroundColor: `${colors.primary}12`, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: `${colors.primary}40` },
  comparisonLabelFree: { ...typography.bodyMedium, color: colors.textSecondary, marginBottom: spacing.sm },
  comparisonLabelPremium: { ...typography.bodyMedium, color: colors.primary, marginBottom: spacing.sm },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  comparisonText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  testimonialsSection: { marginBottom: spacing.xl },
  testimonialsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  testimonialsHeadingCopy: { flex: 1, minWidth: 0 },
  testimonialsNote: { ...typography.tiny, color: colors.textTertiary, marginTop: -spacing.sm, marginBottom: spacing.md },
  testimonialsCarousel: { marginHorizontal: -spacing.lg },
  testimonialCard: {
    width: 300,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginRight: spacing.md,
    marginLeft: spacing.lg,
    ...shadows.card,
  },
  testimonialTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  examTag: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1, minWidth: 0 },
  examTagText: { ...typography.tiny, color: colors.primary, fontWeight: "700", flexShrink: 1 },
  testimonialStars: { color: colors.warning, fontSize: 13, letterSpacing: 1 },
  testimonialResult: { ...typography.bodyMedium, color: colors.accentGreen, marginBottom: spacing.sm },
  testimonialQuote: { ...typography.body, color: colors.textPrimary, lineHeight: 21, marginBottom: spacing.md },
  testimonialName: { ...typography.caption, color: colors.textSecondary },
  carouselDots: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginTop: spacing.md },
  carouselDot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: colors.border },
  carouselDotActive: { width: 18, backgroundColor: colors.primary },
  planCard: {
    position: "relative",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  recommendedPlanCard: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  recommendedBadge: { alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  recommendedBadgeText: { ...typography.tiny, color: colors.white, fontWeight: "700" },
  planHeader: { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.xs },
  planName: { ...typography.h3, color: colors.textPrimary, flex: 1, flexShrink: 1, minWidth: 120 },
  planPrice: { ...typography.h3, color: colors.primary, flexShrink: 1, textAlign: "right", maxWidth: "45%" },
  planDescription: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md, flexShrink: 1 },
  offerPositioning: { ...typography.captionMedium, color: colors.primary, marginBottom: spacing.md, flexShrink: 1 },
  benefitsList: { gap: spacing.sm, marginBottom: spacing.lg },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  benefitText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  planMetaRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, flexWrap: "wrap" },
  planMetaChip: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%", backgroundColor: colors.background, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  planMetaText: { ...typography.tiny, color: colors.textSecondary, flexShrink: 1 },
  chooseButton: { width: "100%", minHeight: 52, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  packButton: { backgroundColor: colors.accentGreen },
  recommendedButton: { backgroundColor: colors.accentGreen },
  chooseButtonText: { ...typography.captionMedium, color: colors.white, textAlign: "center", flexShrink: 1 },
  disclaimer: { ...typography.caption, color: colors.textTertiary, textAlign: "center", marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  packsSection: { marginBottom: spacing.xl },
  supportsHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  supportsHeaderIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  supportsHeaderCopy: { flex: 1 },
  supportsSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.sm, lineHeight: 18 },
  supportSearch: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, color: colors.textPrimary, marginBottom: spacing.sm },
  supportFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  supportFilter: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  supportFilterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  supportFilterText: { ...typography.caption, color: colors.textSecondary },
  supportFilterTextActive: { color: colors.white },
  categoryGroup: { marginBottom: spacing.lg },
  categoryCover: { width: "94%", alignSelf: "center", aspectRatio: 1.45, minHeight: 150, borderRadius: radii.lg, overflow: "hidden", marginBottom: spacing.sm, backgroundColor: colors.primaryDark },
  categoryCoverActive: { borderWidth: 2, borderColor: colors.primary },
  categoryCoverImageBackground: { flex: 1, width: "100%" },
  categoryCoverImage: { borderRadius: radii.lg },
  categoryCoverOverlay: { flex: 1, backgroundColor: "rgba(18,43,110,0.62)", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  categoryCoverEmoji: { fontSize: 28, marginBottom: spacing.xs },
  categoryCoverLabel: { ...typography.h2, color: colors.white, textAlign: "center" },
  coverActionHint: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  coverActionText: { ...typography.captionMedium, color: colors.white },
  paginationRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.lg },
  pageButton: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  pageButtonDisabled: { opacity: 0.35 },
  pageLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  supportKindBadge: { alignSelf: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3, marginBottom: spacing.sm },
  supportKindText: { ...typography.tiny, color: colors.primary },
  packCard: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.accentGreen, padding: spacing.lg, marginBottom: spacing.sm },
  packTitle: { ...typography.h3, color: colors.textPrimary },
  packDescription: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  packExpiry: { ...typography.caption, color: colors.accentGreen, marginTop: spacing.sm },
  openPackButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.sm, minHeight: 48, marginTop: spacing.md },
  openPackLabel: { ...typography.bodyMedium, color: colors.white },
  packOfferCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accentGreen}60`,
    ...shadows.card,
  },
  pressed: { opacity: 0.75 },
});
