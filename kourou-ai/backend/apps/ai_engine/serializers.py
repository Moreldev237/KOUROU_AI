from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.exams.models import Exam, Subject, Topic

from .models import Difficulty, Question, QCMSession, SessionMode, TutorConversation, TutorMessage, UserAnswer


class GenerateQCMRequestSerializer(serializers.Serializer):
    exam = serializers.PrimaryKeyRelatedField(queryset=Exam.objects.filter(is_active=True))
    subject = serializers.PrimaryKeyRelatedField(queryset=Subject.objects.all())
    topic = serializers.PrimaryKeyRelatedField(queryset=Topic.objects.all(), required=False, allow_null=True)
    mode = serializers.ChoiceField(choices=SessionMode.choices, default=SessionMode.QCM_BATCH)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, default=Difficulty.MOYEN)
    question_count = serializers.IntegerField(min_value=1, max_value=20, default=10)

    def validate(self, attrs):
        if attrs.get("topic") and attrs["topic"].subject_id != attrs["subject"].id:
            raise serializers.ValidationError({"topic": "Ce thème n'appartient pas à la matière sélectionnée."})
        if attrs["subject"].exam_id != attrs["exam"].id:
            raise serializers.ValidationError({"subject": "Cette matière n'appartient pas au concours sélectionné."})
        return attrs


class QuestionPublicSerializer(serializers.ModelSerializer):
    """Version envoyée AVANT que le candidat ne réponde : pas de bonne réponse ni d'explication."""

    class Meta:
        model = Question
        fields = ["id", "order", "question_text", "choices"]


class QuestionCorrectedSerializer(serializers.ModelSerializer):
    """Version envoyée UNE FOIS la session terminée : révèle la bonne réponse + la correction détaillée."""

    selected_choice_key = serializers.CharField(source="answer.selected_choice_key", read_only=True, default=None)
    is_correct = serializers.BooleanField(source="answer.is_correct", read_only=True, default=None)

    class Meta:
        model = Question
        fields = [
            "id",
            "order",
            "question_text",
            "choices",
            "correct_choice_key",
            "explanation",
            "selected_choice_key",
            "is_correct",
        ]


class QCMSessionSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = QCMSession
        fields = [
            "id",
            "exam",
            "exam_name",
            "subject",
            "subject_name",
            "topic",
            "mode",
            "difficulty",
            "served_from_cache",
            "started_at",
            "completed_at",
            "score_percent",
            "questions",
        ]

    @extend_schema_field(QuestionCorrectedSerializer(many=True))
    def get_questions(self, obj):
        queryset = obj.questions.all().order_by("order")
        if obj.is_completed:
            return QuestionCorrectedSerializer(queryset, many=True).data
        return QuestionPublicSerializer(queryset, many=True).data


class QCMSessionListSerializer(serializers.ModelSerializer):
    """Version allégée pour l'historique (Module 1 : tableau de bord / statistiques de performance)."""

    exam_name = serializers.CharField(source="exam.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    question_count = serializers.IntegerField(source="questions.count", read_only=True)

    class Meta:
        model = QCMSession
        fields = [
            "id",
            "exam_name",
            "subject_name",
            "difficulty",
            "started_at",
            "completed_at",
            "score_percent",
            "question_count",
        ]


class SubmitAnswerRequestSerializer(serializers.Serializer):
    question = serializers.PrimaryKeyRelatedField(queryset=Question.objects.all())
    selected_choice_key = serializers.CharField(max_length=4)

    def validate(self, attrs):
        question = attrs["question"]
        valid_keys = {c["key"] for c in question.choices}
        if attrs["selected_choice_key"] not in valid_keys:
            raise serializers.ValidationError({"selected_choice_key": "Choix invalide pour cette question."})
        if hasattr(question, "answer"):
            raise serializers.ValidationError("Cette question a déjà reçu une réponse.")
        return attrs


class SubmitAnswerResultSerializer(serializers.ModelSerializer):
    correct_choice_key = serializers.CharField(source="question.correct_choice_key", read_only=True)
    explanation = serializers.CharField(source="question.explanation", read_only=True)

    class Meta:
        model = UserAnswer
        fields = ["is_correct", "correct_choice_key", "explanation", "answered_at"]


class TutorConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorConversation
        fields = ["id", "exam", "subject", "topic", "title", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TutorMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorMessage
        fields = ["id", "role", "content", "created_at"]


class TutorChatRequestSerializer(serializers.Serializer):
    conversation = serializers.PrimaryKeyRelatedField(
        queryset=TutorConversation.objects.all(), required=False, allow_null=True
    )
    exam = serializers.PrimaryKeyRelatedField(queryset=Exam.objects.all(), required=False, allow_null=True)
    subject = serializers.PrimaryKeyRelatedField(queryset=Subject.objects.all(), required=False, allow_null=True)
    topic = serializers.PrimaryKeyRelatedField(queryset=Topic.objects.all(), required=False, allow_null=True)
    message = serializers.CharField(max_length=4000)
