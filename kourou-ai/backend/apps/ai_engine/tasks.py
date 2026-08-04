import logging

from celery import shared_task

logger = logging.getLogger("apps")


@shared_task
def warm_cache_for_subject(exam_id: int, subject_id: int, difficulty: str = "moyen", question_count: int = 10):
    """
    Tâche facultative permettant au back-office de "pré-chauffer" le cache
    pour une matière très demandée (ex : juste après l'annonce d'un concours),
    afin que les premiers candidats bénéficient déjà d'une réponse instantanée
    à coût nul. Peut être déclenchée manuellement (action d'admin) ou via
    Celery Beat sur les matières les plus consultées.
    """
    from apps.exams.models import Exam, Subject
    from apps.ai_engine.models import SessionMode
    from apps.ai_engine.services import cache_service

    exam = Exam.objects.get(pk=exam_id)
    subject = Subject.objects.get(pk=subject_id)

    cache_key = cache_service.build_cache_key(
        exam_id=exam.id,
        subject_id=subject.id,
        topic_id=None,
        mode=SessionMode.QCM_BATCH,
        difficulty=difficulty,
        question_count=question_count,
    )
    payload, _ = cache_service.get_cached_payload(cache_key)
    if payload is not None:
        logger.info("Cache déjà chaud pour %s / %s — rien à faire.", exam, subject)
        return "already_cached"

    from apps.ai_engine.services import generation_service

    # On génère "pour personne" en particulier : on réutilise directement le
    # pipeline de génération/caching sans créer de session candidat.
    generation_service._generate_and_cache(  # noqa: SLF001 — usage interne volontaire
        user=None,
        cache_key=cache_key,
        exam=exam,
        subject=subject,
        topic=None,
        mode=SessionMode.QCM_BATCH,
        difficulty=difficulty,
        question_count=question_count,
    )
    return "generated"
