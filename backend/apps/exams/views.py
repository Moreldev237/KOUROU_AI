from drf_spectacular.utils import extend_schema
from rest_framework import permissions, viewsets

from .models import Exam, Subject, Topic
from .serializers import (
    ExamDetailSerializer,
    ExamListSerializer,
    SubjectSerializer,
    TopicSerializer,
)


@extend_schema(tags=["Concours"])
class ExamViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catalogue des concours disponibles (ENAM, Police, Douane, ENS, ...).

    - `list` renvoie une version allégée (payload minimal, adapté au 3G/4G).
    - `retrieve` renvoie le détail avec les matières du programme officiel.
    """

    queryset = Exam.objects.filter(is_active=True).prefetch_related("subjects__topics")
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "code"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ExamDetailSerializer
        return ExamListSerializer


@extend_schema(tags=["Concours"])
class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    """Détail d'une matière avec la liste de ses thèmes (utilisé avant de lancer un QCM ciblé)."""

    queryset = Subject.objects.select_related("exam").prefetch_related("topics")
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["exam"]


@extend_schema(tags=["Concours"])
class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Topic.objects.select_related("subject")
    serializer_class = TopicSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["subject"]
