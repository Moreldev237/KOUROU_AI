import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { InfoCard, InfoHero, InfoPage, InfoSection, InfoText, infoStyles } from "@/components/InfoPage";
import { colors, spacing } from "@/theme";

export default function RateAppScreen() {
  const openStore = () => Linking.openURL("https://play.google.com/store/apps/details?id=com.kourouai.app").catch(() => {});

  return (
    <InfoPage title="Noter l’application" icon="star-outline">
      <InfoHero eyebrow="VOTRE AVIS COMPTE" title="Aidez-nous à progresser.">
        Quelques secondes pour vous, un vrai coup de pouce pour les prochains candidats.
      </InfoHero>
      <InfoCard>
        <Text style={infoStyles.cardTitle}>Comment évaluez-vous votre expérience ?</Text>
        <View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Text key={star} style={styles.star}>★</Text>)}</View>
        <Text style={infoStyles.text}>Une note et quelques mots sur votre expérience nous sont très utiles.</Text>
        <Pressable style={infoStyles.actionButton} onPress={openStore}>
          <Text style={infoStyles.actionText}>Ouvrir Google Play</Text>
        </Pressable>
      </InfoCard>
      <InfoSection title="Ce que votre avis nous aide à améliorer">
        <InfoText>La qualité des questions, la clarté des corrections et la simplicité de votre parcours dans l’application.</InfoText>
      </InfoSection>
    </InfoPage>
  );
}

const styles = StyleSheet.create({ stars: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }, star: { fontSize: 30, color: colors.warning } });
