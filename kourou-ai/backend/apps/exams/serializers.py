from rest_framework import serializers

from .models import Exam, Subject, Topic


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ["id", "name", "order"]


class SubjectSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = ["id", "name", "description", "coefficient", "order", "topics"]


class SubjectListSerializer(serializers.ModelSerializer):
    """Version allégée (sans les topics) pour l'affichage en liste — réduit la charge réseau mobile."""

    topics_count = serializers.IntegerField(source="topics.count", read_only=True)

    class Meta:
        model = Subject
        fields = ["id", "name", "coefficient", "order", "topics_count"]


class ExamListSerializer(serializers.ModelSerializer):
    """Version allégée pour la liste des concours (Module NFR : mobile-first, faible bande passante)."""

    subjects_count = serializers.IntegerField(source="subjects.count", read_only=True)

    class Meta:
        model = Exam
        fields = ["id", "name", "code", "organizing_body", "icon_emoji", "color_hex", "subjects_count"]


class ExamDetailSerializer(serializers.ModelSerializer):
    subjects = SubjectListSerializer(many=True, read_only=True)

    class Meta:
        model = Exam
        fields = [
            "id",
            "name",
            "code",
            "description",
            "organizing_body",
            "icon_emoji",
            "color_hex",
            "subjects",
        ]
