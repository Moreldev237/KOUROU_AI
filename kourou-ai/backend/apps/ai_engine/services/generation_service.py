"""
Orchestration du "Mode QCM Interactif" / "Mode Exercice" (Module 2) :

    1. Vérifier le quota du candidat (Module 3).
    2. Vérifier le cache applicatif (Redis puis PostgreSQL) — zéro token si trouvé.
    3. Sinon, appeler Gemini (avec cache de contexte natif optionnel), puis
       mettre le résultat en cache pour tous les candidats suivants.
    4. Persister la session et les questions en base pour ce candidat.
"""
import logging

from django.db import transaction

from apps.quotas.services import consume_quota
from apps.quotas.tasks import log_token_usage

from ..models import Question, QCMSession
from . import cache_service, gemini_client, prompt_templates

logger = logging.getLogger("apps")


def create_qcm_session(*, user, exam, subject, topic, mode: str, difficulty: str, question_count: int) -> QCMSession:
    consume_quota(user)  # lève QuotaExceededException si dépassé

    cache_key = cache_service.build_cache_key(
        exam_id=exam.id,
        subject_id=subject.id,
        topic_id=topic.id if topic else None,
        mode=mode,
        difficulty=difficulty,
        question_count=question_count,
    )

    payload, cached_generation = cache_service.get_cached_payload(cache_key)
    served_from_cache = payload is not None

    if payload is None:
        payload, cached_generation = _generate_and_cache(
            user=user,
            cache_key=cache_key,
            exam=exam,
            subject=subject,
            topic=topic,
            mode=mode,
            difficulty=difficulty,
            question_count=question_count,
        )

    with transaction.atomic():
        session = QCMSession.objects.create(
            user=user,
            exam=exam,
            subject=subject,
            topic=topic,
            mode=mode,
            difficulty=difficulty,
            served_from_cache=served_from_cache,
            cached_generation=cached_generation,
        )
        Question.objects.bulk_create(
            [
                Question(
                    session=session,
                    order=i + 1,
                    question_text=q["question_text"],
                    choices=q["choices"],
                    correct_choice_key=q["correct_choice_key"],
                    explanation=q["explanation"],
                )
                for i, q in enumerate(payload["questions"])
            ]
        )

    return session


def _generate_and_cache(*, user, cache_key, exam, subject, topic, mode, difficulty, question_count):
    syllabus_text = (
        topic.syllabus_reference
        if topic
        else "\n".join(t.syllabus_reference for t in subject.topics.all() if t.syllabus_reference)
    )

    system_instruction = prompt_templates.qcm_system_instruction()
    cached_content_name = gemini_client.get_or_create_context_cache(
        subject_id=subject.id,
        system_instruction=system_instruction,
        syllabus_text=syllabus_text,
    )
    prompt = prompt_templates.build_qcm_prompt(
        exam_name=exam.name,
        subject_name=subject.name,
        topic_name=topic.name if topic else None,
        syllabus_reference=syllabus_text,
        difficulty=difficulty,
        question_count=question_count,
    )

    data, tokens_used = gemini_client.generate_qcm(
        system_instruction=system_instruction,
        prompt=prompt,
        cached_content_name=cached_content_name,
    )
    payload = data.model_dump()

    log_token_usage.delay(
        user_id=str(user.id) if user is not None else None, tokens_used=tokens_used, endpoint="qcm_generation"
    )

    cached_generation = cache_service.store_generated_payload(
        cache_key=cache_key,
        exam=exam,
        subject=subject,
        topic=topic,
        mode=mode,
        difficulty=difficulty,
        question_count=question_count,
        payload=payload,
        tokens_used=tokens_used,
    )
    return payload, cached_generation
