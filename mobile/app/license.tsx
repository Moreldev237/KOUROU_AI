import { InfoCard, InfoHero, InfoPage, InfoSection, InfoText, infoStyles } from "@/components/InfoPage";
import { Text } from "react-native";

export default function LicenseScreen() {
  return (
    <InfoPage title="Licence" icon="document-text-outline">
      <InfoHero eyebrow="INFORMATIONS LÉGALES" title="Une création protégée.">
        Kourou AI s’appuie sur un produit original et sur des composants open source respectés avec transparence.
      </InfoHero>
      <InfoCard>
        <Text style={infoStyles.cardTitle}>Kourou AI · Version 1.0.0</Text>
        <InfoText>Copyright 2026 Kourou AI. Tous droits réservés.</InfoText>
      </InfoCard>
      <InfoSection title="Utilisation">
        <InfoText>L’application, son contenu, son identité visuelle et ses fonctionnalités sont protégés par les lois applicables. Toute reproduction ou utilisation commerciale non autorisée est interdite.</InfoText>
      </InfoSection>
      <InfoSection title="Composants open source">
        <InfoText>Kourou AI utilise des bibliothèques open source. Leurs licences et notices restent applicables à leurs composants respectifs.</InfoText>
      </InfoSection>
    </InfoPage>
  );
}
