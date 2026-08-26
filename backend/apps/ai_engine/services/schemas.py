"""
Schémas de sortie structurée pour Gemini (`response_schema`).

Utiliser des modèles Pydantic plutôt qu'un JSON-schema écrit à la main donne
une garantie de typage à la fois côté prompt (Gemini reçoit un schéma précis)
et côté réception (validation automatique de la réponse, erreurs explicites
si le modèle dérive du format attendu).
"""
from pydantic import BaseModel, Field


class ChoiceSchema(BaseModel):
    key: str = Field(description="Lettre du choix : A, B, C ou D.")
    text: str = Field(description="Texte de l'option de réponse.")


class QuestionSchema(BaseModel):
    question_text: str
    choices: list[ChoiceSchema] = Field(min_length=4, max_length=4)
    correct_choice_key: str = Field(description="Doit correspondre à l'une des clés de `choices` (A/B/C/D).")
    explanation: str = Field(
        description="Correction détaillée étape par étape : pourquoi la bonne réponse est correcte "
        "et pourquoi chacun des autres choix est incorrect."
    )


class QCMGenerationSchema(BaseModel):
    questions: list[QuestionSchema]
