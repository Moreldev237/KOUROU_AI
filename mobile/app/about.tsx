import { StyleSheet, Text, View } from "react-native";

import { InfoCard, InfoHero, InfoMetric, InfoPage, InfoSection, InfoText, infoStyles } from "@/components/InfoPage";

export default function AboutScreen() {
  return (
    <InfoPage title="À propos de Kourou AI" icon="information-circle-outline">
      <InfoHero eyebrow="NOTRE PROMESSE" title="Chaque session compte.">
        Une préparation plus régulière, plus ciblée et plus proche de vos objectifs.
      </InfoHero>
      <View style={styles.metrics}>
        <InfoMetric value="QCM" label="Entraînement ciblé" />
        <InfoMetric value="IA" label="Tuteur disponible" />
        <InfoMetric value="24/7" label="À votre rythme" />
      </View>
      <InfoCard>
        <Text style={infoStyles.cardTitle}>Pourquoi Kourou AI ?</Text>
        <InfoText>Nous réunissons les outils essentiels pour transformer une révision ponctuelle en véritable routine de progression.</InfoText>
      </InfoCard>
      <InfoSection title="Notre mission">
        <InfoText>Vous entraîner sur les bons sujets, comprendre vos erreurs et garder le rythme jusqu’au jour du concours.</InfoText>
      </InfoSection>
      <InfoSection title="Version">
        <InfoText>Kourou AI 1.0.0</InfoText>
      </InfoSection>
    </InfoPage>
  );
}

const styles = StyleSheet.create({ metrics: { flexDirection: "row", gap: 8, marginBottom: 20 } });
