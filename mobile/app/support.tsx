import { Linking, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { InfoCard, InfoHero, InfoPage, InfoSection, InfoText, infoStyles } from "@/components/InfoPage";

const SUPPORT_EMAIL = "kourouai237@gmail.com";
const MTN_NUMBER = "683591916";
const ORANGE_NUMBER = "686865451";
const WHATSAPP_NUMBER = "237686865451";

export default function SupportScreen() {
  const contactSupport = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  const callNumber = (number: string) => Linking.openURL(`tel:${number}`).catch(() => {});
  const openWhatsApp = (number: string) => Linking.openURL(`https://wa.me/${number}`).catch(() => {});

  return (
    <InfoPage title="Support client" icon="headset-outline">
      <InfoHero eyebrow="NOUS SOMMES LÀ POUR VOUS" title="Une réponse, sans détour.">
        Décrivez votre besoin et choisissez le canal qui vous convient le mieux.
      </InfoHero>
      <InfoCard>
        <Text style={infoStyles.cardTitle}>Nous contacter</Text>
        <Text style={infoStyles.text}>Décrivez votre problème avec l’adresse e-mail utilisée dans l’application.</Text>
        <Text style={infoStyles.contact}><Ionicons name="mail-outline" size={16} color="#235AA4" />  {SUPPORT_EMAIL}</Text>
        <Pressable style={infoStyles.actionButton} onPress={contactSupport}>
          <Text style={infoStyles.actionText}>Écrire au support</Text>
        </Pressable>
      </InfoCard>
      <InfoCard>
        <Text style={infoStyles.cardTitle}>Téléphone et WhatsApp</Text>
        <Pressable style={infoStyles.contactRow} onPress={() => callNumber(MTN_NUMBER)}>
          <Text style={infoStyles.contactLabel}>MTN</Text>
          <Text style={infoStyles.contact}>{MTN_NUMBER}</Text>
        </Pressable>
        <Pressable style={infoStyles.contactRow} onPress={() => callNumber(ORANGE_NUMBER)}>
          <Text style={infoStyles.contactLabel}>Orange</Text>
          <Text style={infoStyles.contact}>{ORANGE_NUMBER}</Text>
        </Pressable>
        <Pressable style={infoStyles.actionButton} onPress={() => openWhatsApp(WHATSAPP_NUMBER)}>
          <Text style={infoStyles.actionText}>WhatsApp Orange</Text>
        </Pressable>
      </InfoCard>
      <InfoSection title="Pour une réponse plus rapide">
        <InfoText>Ajoutez le modèle de votre téléphone, la version de l’application et une capture du problème. Notre équipe pourra vous répondre plus précisément.</InfoText>
      </InfoSection>
      <InfoSection title="Disponibilité">
        <InfoText>Réponses habituelles du lundi au samedi, de 8 h à 18 h. Les demandes reçues en dehors de ces horaires sont traitées dès que possible.</InfoText>
      </InfoSection>
    </InfoPage>
  );
}
