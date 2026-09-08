import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { InfoHero, InfoPage, InfoText, infoStyles } from "@/components/InfoPage";

const questions = [
  ["Comment commencer un entraînement ?", "Ouvrez Entraînement, choisissez votre concours et votre matière, puis lancez une série de QCM."],
  ["Comment fonctionne le quota ?", "Le quota dépend de votre compte et de votre abonnement. Votre solde est visible depuis l'accueil."],
  ["Puis-je changer de concours ?", "Oui. Retournez dans Entraînement et sélectionnez un autre concours cible."],
  ["Comment contacter le support ?", "Ouvrez la page Support client depuis votre profil pour nous écrire."],
  ["Les réponses de l'IA sont-elles toujours exactes ?", "Non. Vérifiez les informations importantes avec vos cours et les sources officielles."],
] as const;

export default function FAQScreen() {
  const [openQuestion, setOpenQuestion] = useState(0);

  return (
    <InfoPage title="Questions fréquentes" icon="help-circle-outline">
      <InfoHero eyebrow="BESOIN D’UN REPÈRE ?" title="Les réponses essentielles, au même endroit.">
        Retrouvez rapidement les informations utiles pour avancer dans votre préparation.
      </InfoHero>
      {questions.map(([question, answer], index) => (
        <Pressable
          key={question}
          accessibilityRole="button"
          accessibilityState={{ expanded: openQuestion === index }}
          style={infoStyles.faqCard}
          onPress={() => setOpenQuestion((current) => current === index ? -1 : index)}
        >
          <View style={infoStyles.faqQuestion}>
            <Text style={infoStyles.faqTitle}>{question}</Text>
            <Ionicons name={openQuestion === index ? "chevron-up" : "chevron-down"} size={19} color="#235AA4" />
          </View>
          {openQuestion === index ? <InfoText>{answer}</InfoText> : null}
        </Pressable>
      ))}
    </InfoPage>
  );
}
