import uuid

from django.conf import settings
from django.db import models


class Difficulty(models.TextChoices):
    FACILE = "facile", "Facile"
    MOYEN = "moyen", "Moyen"
    DIFFICILE = "difficile", "Difficile"


class SessionMode(models.TextChoices):
    # Module 2 : "Mode QCM Interactif" — série complète, corrections à la fin.
    QCM_BATCH = "qcm_batch", "QCM (série complète)"
    # Module 2 : "Mode Exercice & Correction Détaillée" — une question à la
    # fois, correction détaillée immédiate après chaque réponse.
    GUIDED_EXERCISE = "guided_exercise", "Exercice guidé"


class CachedGeneration(models.Model):
    """
    Cœur du "Moteur de Cache Intelligent" du cahier des charges : avant tout
    appel payant à l'API Gemini, on vérifie si un contenu équivalent a déjà
    été généré pour cette combinaison (concours, matière, thème, difficulté,
    mode, nombre de questions). Si oui : coût = zéro token.

    `cache_key` est un hash déterministe de ces paramètres (voir
    services/cache_service.py). Le payload est réutilisable par N sessions
    différentes, ce qui permet une marge élevée sur les sujets populaires.
    """

    cache_key = models.CharField(max_length=64, unique=True, db_index=True)
    exam = models.ForeignKey("exams.Exam", on_delete=models.CASCADE, related_name="+")
    subject = models.ForeignKey("exams.Subject", on_delete=models.CASCADE, related_name="+")
    topic = models.ForeignKey("exams.Topic", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    mode = models.CharField(max_length=20, choices=SessionMode.choices)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices)
    question_count = models.PositiveSmallIntegerField()

    # Contenu généré par Gemini, au format JSON (liste de questions structurées).
    payload = models.JSONField()

    tokens_used_on_generation = models.PositiveIntegerField(default=0)
    hit_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_engine_cached_generation"
        indexes = [models.Index(fields=["exam", "subject", "topic", "difficulty"])]
        verbose_name = "Génération mise en cache"
        verbose_name_plural = "Générations mises en cache"

    def __str__(self):
        return f"Cache[{self.cache_key[:10]}...] ({self.hit_count} réutilisations)"

    def register_hit(self):
        from django.utils import timezone

        self.hit_count = models.F("hit_count") + 1
        self.last_used_at = timezone.now()
        self.save(update_fields=["hit_count", "last_used_at"])


class QCMSession(models.Model):
    """Une session d'entraînement : un lot de questions généré pour un candidat."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="qcm_sessions")
    exam = models.ForeignKey("exams.Exam", on_delete=models.CASCADE, related_name="+")
    subject = models.ForeignKey("exams.Subject", on_delete=models.CASCADE, related_name="+")
    topic = models.ForeignKey("exams.Topic", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    mode = models.CharField(max_length=20, choices=SessionMode.choices, default=SessionMode.QCM_BATCH)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.MOYEN)

    # Traçabilité : la session a-t-elle coûté des tokens ou est-elle venue du cache ?
    served_from_cache = models.BooleanField(default=False)
    cached_generation = models.ForeignKey(
        CachedGeneration, null=True, blank=True, on_delete=models.SET_NULL, related_name="sessions"
    )

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score_percent = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "ai_engine_qcm_session"
        ordering = ["-started_at"]
        verbose_name = "Session de QCM"
        verbose_name_plural = "Sessions de QCM"

    def __str__(self):
        return f"Session {self.id} — {self.user} — {self.subject}"

    @property
    def is_completed(self) -> bool:
        return self.completed_at is not None


class Question(models.Model):
    """Une question à choix multiples appartenant à une session."""

    session = models.ForeignKey(QCMSession, on_delete=models.CASCADE, related_name="questions")
    order = models.PositiveSmallIntegerField()
    question_text = models.TextField()
    # Liste de choix : [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, ...]
    choices = models.JSONField()
    correct_choice_key = models.CharField(max_length=4)
    explanation = models.TextField(
        help_text="Correction détaillée étape par étape (Module 2 : Exercice & Correction Détaillée)."
    )

    class Meta:
        db_table = "ai_engine_question"
        ordering = ["session", "order"]
        unique_together = [("session", "order")]
        verbose_name = "Question"
        verbose_name_plural = "Questions"

    def __str__(self):
        return f"Q{self.order} — {self.question_text[:60]}"


class UserAnswer(models.Model):
    """La réponse donnée par le candidat à une question précise."""

    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name="answer")
    selected_choice_key = models.CharField(max_length=4)
    is_correct = models.BooleanField()
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_engine_user_answer"
        verbose_name = "Réponse candidat"
        verbose_name_plural = "Réponses candidats"

    def __str__(self):
        return f"{self.question} -> {self.selected_choice_key} ({'✓' if self.is_correct else '✗'})"


class TutorConversation(models.Model):
    """Un fil de discussion avec le Tuteur IA (Module 2 : Tuteur IA Interactif)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tutor_conversations")
    exam = models.ForeignKey("exams.Exam", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    subject = models.ForeignKey("exams.Subject", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    topic = models.ForeignKey("exams.Topic", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_engine_tutor_conversation"
        ordering = ["-updated_at"]
        verbose_name = "Conversation avec le tuteur"
        verbose_name_plural = "Conversations avec le tuteur"

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class MessageRole(models.TextChoices):
    USER = "user", "Candidat"
    ASSISTANT = "assistant", "Tuteur IA"


class TutorMessage(models.Model):
    conversation = models.ForeignKey(TutorConversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=MessageRole.choices)
    content = models.TextField()
    tokens_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_engine_tutor_message"
        ordering = ["conversation", "created_at"]
        verbose_name = "Message du tuteur"
        verbose_name_plural = "Messages du tuteur"

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}"
