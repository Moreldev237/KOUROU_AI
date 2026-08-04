"""
Moteur de cache intelligent (Module 2) : Redis d'abord (rapide), PostgreSQL
ensuite (durable), TOUJOURS vérifiés avant le moindre appel payant à Gemini.
C'est ce mécanisme qui permet la marge nette élevée visée par le cahier des
charges sur les sujets déjà demandés par d'autres candidats.
"""
import hashlib
import logging

from django.core.cache import cache

from apps.ai_engine.models import CachedGeneration

logger = logging.getLogger("apps")

REDIS_TTL_SECONDS = 60 * 60 * 6  # 6h — copie rapide en Redis d'un résultat déjà en base


def build_cache_key(*, exam_id: int, subject_id: int, topic_id: int | None, mode: str, difficulty: str, question_count: int) -> str:
    raw = f"v1:{exam_id}:{subject_id}:{topic_id or 0}:{mode}:{difficulty}:{question_count}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_cached_payload(cache_key: str):
    """Renvoie (payload, cached_generation) si un résultat existe déjà, sinon (None, None)."""
    redis_key = f"aigen:{cache_key}"
    payload = cache.get(redis_key)

    if payload is not None:
        logger.debug("Cache HIT (Redis) — %s", cache_key)
        cached_generation = CachedGeneration.objects.filter(cache_key=cache_key).first()
        if cached_generation:
            cached_generation.register_hit()
        return payload, cached_generation

    cached_generation = CachedGeneration.objects.filter(cache_key=cache_key).first()
    if cached_generation is None:
        logger.debug("Cache MISS — %s", cache_key)
        return None, None

    logger.debug("Cache HIT (PostgreSQL) — %s", cache_key)
    cache.set(redis_key, cached_generation.payload, REDIS_TTL_SECONDS)
    cached_generation.register_hit()
    return cached_generation.payload, cached_generation


def store_generated_payload(
    *, cache_key: str, exam, subject, topic, mode: str, difficulty: str, question_count: int, payload, tokens_used: int
) -> CachedGeneration:
    cached_generation, _created = CachedGeneration.objects.update_or_create(
        cache_key=cache_key,
        defaults=dict(
            exam=exam,
            subject=subject,
            topic=topic,
            mode=mode,
            difficulty=difficulty,
            question_count=question_count,
            payload=payload,
            tokens_used_on_generation=tokens_used,
        ),
    )
    cache.set(f"aigen:{cache_key}", payload, REDIS_TTL_SECONDS)
    return cached_generation
