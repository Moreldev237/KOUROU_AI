from django.db import models
from django.utils.text import slugify


class Exam(models.Model):
    """Un concours administratif (ENAM, Police, Douane, ENS, ...)."""

    name = models.CharField(max_length=150, unique=True)
    code = models.SlugField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True)
    organizing_body = models.CharField(
        max_length=150, blank=True, help_text="Ex : Ministère de la Fonction Publique"
    )
    icon_emoji = models.CharField(max_length=8, blank=True, default="🎓")
    color_hex = models.CharField(max_length=7, blank=True, default="#1B4F91")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exams_exam"
        ordering = ["name"]
        verbose_name = "Concours"
        verbose_name_plural = "Concours"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = slugify(self.name)
        super().save(*args, **kwargs)


class Subject(models.Model):
    """Une matière du programme officiel d'un concours (ex : Culture Générale, Droit Public)."""

    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="subjects")
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    coefficient = models.PositiveSmallIntegerField(default=1)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "exams_subject"
        ordering = ["exam", "order", "name"]
        unique_together = [("exam", "name")]
        verbose_name = "Matière"
        verbose_name_plural = "Matières"

    def __str__(self):
        return f"{self.name} ({self.exam.name})"


class Topic(models.Model):
    """Un thème/chapitre précis à l'intérieur d'une matière (ex : « Institutions de la République »)."""

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="topics")
    name = models.CharField(max_length=200)
    # Contenu du programme officiel utilisé comme contexte de référence pour
    # guider la génération IA (et candidat, le cas échéant, au cache de
    # contexte natif de Gemini — voir apps/ai_engine/services/gemini_client.py).
    syllabus_reference = models.TextField(
        blank=True,
        help_text="Extrait du programme officiel servant de contexte à l'IA pour rester conforme au syllabus.",
    )
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "exams_topic"
        ordering = ["subject", "order", "name"]
        unique_together = [("subject", "name")]
        verbose_name = "Thème"
        verbose_name_plural = "Thèmes"

    def __str__(self):
        return f"{self.name} — {self.subject.name}"
