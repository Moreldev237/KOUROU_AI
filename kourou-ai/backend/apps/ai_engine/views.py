import json
import logging

from django.http import StreamingHttpResponse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.quotas.services import consume_quota
from apps.quotas.tasks import log_token_usage
from common.exceptions import AIGenerationError

from . import serializers as s
from .models import MessageRole, QCMSession, TutorConversation, TutorMessage, UserAnswer
from .services import generation_service, gemini_client, prompt_templates

logger = logging.getLogger("apps")


@extend_schema(
    tags=["Moteur IA — QCM"],
    request=s.GenerateQCMRequestSerializer,
    responses={201: s.QCMSessionSerializer},
)
class GenerateQCMView(APIView):
    """
    Génère un lot de QCM (Module 2). Passe systématiquement par le cache
    applicatif avant tout appel Gemini — voir services/cache_service.py.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "ai_generation"

    def post(self, request):
        serializer = s.GenerateQCMRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        session = generation_service.create_qcm_session(
            user=request.user,
            exam=d["exam"],
            subject=d["subject"],
            topic=d.get("topic"),
            mode=d["mode"],
            difficulty=d["difficulty"],
            question_count=d["question_count"],
        )
        return Response(s.QCMSessionSerializer(session).data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=["Moteur IA — QCM"],
    request=s.SubmitAnswerRequestSerializer,
    responses={200: s.SubmitAnswerResultSerializer},
)
class SubmitAnswerView(APIView):
    """Enregistre la réponse du candidat à une question et renvoie la correction détaillée."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "ai_generation"

    def post(self, request):
        serializer = s.SubmitAnswerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["question"]

        if question.session.user_id != request.user.id:
            raise PermissionDenied("Cette question n'appartient pas à une de vos sessions.")

        selected = serializer.validated_data["selected_choice_key"]
        answer = UserAnswer.objects.create(
            question=question,
            selected_choice_key=selected,
            is_correct=(selected == question.correct_choice_key),
        )
        _maybe_complete_session(question.session)

        return Response(s.SubmitAnswerResultSerializer(answer).data)


def _maybe_complete_session(session: QCMSession) -> None:
    total = session.questions.count()
    answered = UserAnswer.objects.filter(question__session=session).count()
    if total and answered >= total and session.completed_at is None:
        correct = UserAnswer.objects.filter(question__session=session, is_correct=True).count()
        session.score_percent = round((correct / total) * 100, 1)
        session.completed_at = timezone.now()
        session.save(update_fields=["score_percent", "completed_at"])


@extend_schema(tags=["Moteur IA — QCM"])
class QCMSessionHistoryView(generics.ListAPIView):
    """Historique des sessions du candidat (Module 1 : statistiques de performance)."""

    serializer_class = s.QCMSessionListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["exam", "subject", "difficulty"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return QCMSession.objects.none()
        return QCMSession.objects.filter(user=self.request.user).select_related("exam", "subject")


@extend_schema(tags=["Moteur IA — QCM"])
class QCMSessionDetailView(generics.RetrieveAPIView):
    """
    Détail d'une session : questions sans réponse tant qu'elle est en cours,
    correction complète une fois terminée.
    """

    serializer_class = s.QCMSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "id"

    def get_queryset(self):
        return QCMSession.objects.filter(user=self.request.user).prefetch_related("questions__answer")


@extend_schema(tags=["Tuteur IA"])
class TutorConversationListView(generics.ListAPIView):
    serializer_class = s.TutorConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TutorConversation.objects.none()
        return TutorConversation.objects.filter(user=self.request.user)


@extend_schema(tags=["Tuteur IA"])
class TutorConversationMessagesView(generics.ListAPIView):
    serializer_class = s.TutorMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TutorMessage.objects.none()
        conversation = generics.get_object_or_404(
            TutorConversation, id=self.kwargs["conversation_id"], user=self.request.user
        )
        return conversation.messages.all()


@extend_schema(
    tags=["Tuteur IA"],
    request=s.TutorChatRequestSerializer,
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.STR,
            description=(
                "Flux Server-Sent Events (`text/event-stream`), pas un JSON classique. "
                "Événements envoyés dans l'ordre : `meta` (conversation_id, is_new), "
                "puis un ou plusieurs `message` (fragments de texte au fil de la génération), "
                "puis `done` (ou `error` en cas d'échec du moteur IA)."
            ),
        )
    },
)
class TutorChatView(APIView):
    """
    Tuteur IA interactif, réponse en streaming SSE (NFR : rendu en moins de 3s).
    Le client mobile consomme ce endpoint en POST via une librairie compatible
    EventSource+POST (voir mobile/src/hooks/useTutorStream.ts, react-native-sse).
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "tutor_chat"

    def post(self, request):
        serializer = s.TutorChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        consume_quota(request.user)  # le tuteur consomme aussi le quota gratuit journalier

        conversation = d.get("conversation")
        if conversation is not None and conversation.user_id != request.user.id:
            raise PermissionDenied("Cette conversation ne vous appartient pas.")

        is_new_conversation = conversation is None
        if is_new_conversation:
            conversation = TutorConversation.objects.create(
                user=request.user,
                exam=d.get("exam"),
                subject=d.get("subject"),
                topic=d.get("topic"),
                title=d["message"][:80],
            )

        TutorMessage.objects.create(conversation=conversation, role=MessageRole.USER, content=d["message"])

        system_instruction = prompt_templates.tutor_system_instruction(
            exam_name=conversation.exam.name if conversation.exam else None,
            subject_name=conversation.subject.name if conversation.subject else None,
            topic_name=conversation.topic.name if conversation.topic else None,
        )
        history = _build_gemini_history(conversation)

        response = StreamingHttpResponse(
            _sse_stream(
                conversation=conversation,
                is_new_conversation=is_new_conversation,
                system_instruction=system_instruction,
                history=history,
                user_message=d["message"],
                user_id=request.user.id,
            ),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # empêche Nginx de mettre le flux SSE en mémoire tampon
        return response


def _build_gemini_history(conversation: TutorConversation) -> list[dict]:
    history = []
    # Le dernier message (celui qu'on vient de créer) n'est pas inclus dans
    # l'historique : il est envoyé séparément comme `user_message`.
    for msg in conversation.messages.order_by("created_at")[: max(conversation.messages.count() - 1, 0)]:
        role = "user" if msg.role == MessageRole.USER else "model"
        history.append({"role": role, "parts": [{"text": msg.content}]})
    return history


def _sse_stream(*, conversation, is_new_conversation, system_instruction, history, user_message, user_id):
    yield _format_sse(
        json.dumps({"conversation_id": str(conversation.id), "is_new": is_new_conversation}), event="meta"
    )

    full_reply: list[str] = []
    tokens_used = 0
    try:
        for chunk in gemini_client.stream_tutor_reply(
            system_instruction=system_instruction, history=history, user_message=user_message
        ):
            if isinstance(chunk, tuple) and chunk[0] == "__usage__":
                tokens_used = chunk[1]
                continue
            full_reply.append(chunk)
            yield _format_sse(chunk)
    except AIGenerationError as exc:
        yield _format_sse(str(exc), event="error")
        return
    finally:
        if full_reply:
            TutorMessage.objects.create(
                conversation=conversation,
                role=MessageRole.ASSISTANT,
                content="".join(full_reply),
                tokens_used=tokens_used,
            )
            log_token_usage.delay(user_id=str(user_id), tokens_used=tokens_used, endpoint="tutor_chat")

    yield _format_sse("", event="done")


def _format_sse(data: str, event: str = "message") -> str:
    # Une ligne "data:" par ligne de texte, conformément au format SSE.
    payload = "\n".join(f"data: {line}" for line in data.split("\n"))
    return f"event: {event}\n{payload}\n\n"
