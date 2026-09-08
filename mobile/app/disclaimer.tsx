import { InfoCard, InfoHero, InfoPage, InfoSection, InfoText, infoStyles } from "@/components/InfoPage";
import { Text } from "react-native";

export default function DisclaimerScreen() {
  return (
    <InfoPage title="Clause de non-responsabilité" icon="warning-outline">
      <InfoHero eyebrow="À LIRE AVANT DE COMMENCER" title="Un outil pour vous aider à avancer.">
        Kourou AI accompagne votre préparation, mais votre réussite repose aussi sur votre travail et votre jugement.
      </InfoHero>
      <InfoCard>
        <Text style={infoStyles.cardTitle}>À retenir</Text>
        <InfoText>Kourou AI ne garantit pas la réussite à un concours et ne remplace ni les cours, ni les textes officiels, ni l’accompagnement d’un enseignant.</InfoText>
      </InfoCard>
      <InfoSection title="Réponses générées par l'IA">
        <InfoText>Les réponses et corrections générées peuvent contenir des erreurs ou être incomplètes. Vérifiez toujours les informations importantes avec vos supports de cours et les sources officielles.</InfoText>
      </InfoSection>
      <InfoSection title="Résultats et disponibilité">
        <InfoText>Les scores affichés reflètent les réponses saisies dans l’application. Les services peuvent être temporairement indisponibles pour des raisons techniques ou de maintenance.</InfoText>
      </InfoSection>
    </InfoPage>
  );
}
