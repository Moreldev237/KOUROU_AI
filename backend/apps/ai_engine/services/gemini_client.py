"""
Client Gemini pour KOUROU AI (Module 2).

Le nom du modèle est piloté par `settings.GEMINI_MODEL_NAME` plutôt que codé
en dur : Google renouvelle fréquemment sa gamme Gemini (Flash notamment), et
changer de version ne doit nécessiter qu'une variable d'environnement, jamais
une modification de code. Vérifier la liste courante des modèles sur
https://ai.google.dev/gemini-api/docs/models avant toute mise en production.
"""
import json
import logging

from django.conf import settings
from django.core.cache import cache
from google import genai
from google.genai import types

from common.exceptions import AIGenerationError

from .schemas import QCMGenerationSchema

logger = logging.getLogger("apps")

CONTEXT_CACHE_TTL_SECONDS = 60 * 60  # 1h

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise AIGenerationError("GEMINI_API_KEY n'est pas configurée côté serveur.")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def get_or_create_context_cache(*, subject_id: int, system_instruction: str, syllabus_text: str) -> str | None:
    """
    Optimisation secondaire et FACULTATIVE en plus du cache applicatif
    (cache_service.py, qui reste la principale source d'économie de tokens) :
    réutilise un cache de contexte natif Gemini pour tout le programme
    officiel d'une matière, réduisant le coût des tokens d'entrée sur les
    appels de génération successifs pour cette même matière.

    Gemini impose un volume minimal de contenu pour autoriser la mise en
    cache d'un contexte (ce seuil a varié selon les modèles) : si le
    programme officiel est trop court ou si l'appel échoue pour toute autre
    raison, on renvoie simplement None et l'appelant poursuit sans cache de
    contexte — ce n'est jamais bloquant.
    """
    if not settings.GEMINI_ENABLE_CONTEXT_CACHING or not syllabus_text.strip():
        return None

    redis_key = f"gemini_ctx_cache:{subject_id}"
    cached_name = cache.get(redis_key)
    if cached_name:
        return cached_name

    try:
        created = get_client().caches.create(
            model=settings.GEMINI_MODEL_NAME,
            config=types.CreateCachedContentConfig(
                display_name=f"kourou-subject-{subject_id}",
                system_instruction=system_instruction,
                contents=[syllabus_text],
                ttl=f"{CONTEXT_CACHE_TTL_SECONDS}s",
            ),
        )
    except Exception:  # pragma: no cover - dépend d'un service externe / seuil de taille
        logger.info(
            "Cache de contexte Gemini non créé pour subject=%s (programme trop court, ou "
            "erreur API) — poursuite sans cache de contexte natif.",
            subject_id,
        )
        return None

    cache.set(redis_key, created.name, CONTEXT_CACHE_TTL_SECONDS - 60)
    return created.name


def generate_qcm(
    *, system_instruction: str, prompt: str, cached_content_name: str | None = None
) -> tuple[QCMGenerationSchema, int]:
    """Génère un lot de QCM en sortie structurée (JSON validé par Pydantic). Renvoie (données, tokens_utilisés)."""
    config_kwargs = {
        "response_mime_type": "application/json",
        "response_schema": QCMGenerationSchema,
        "temperature": 0.7,
    }
    if cached_content_name:
        # Le contexte (système + programme officiel) est déjà dans le cache : on ne
        # le renvoie pas une seconde fois.
        config_kwargs["cached_content"] = cached_content_name
    else:
        config_kwargs["system_instruction"] = system_instruction

    try:
        response = get_client().models.generate_content(
            model=settings.GEMINI_MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs),
        )
    except Exception as exc:  # pragma: no cover - dépend d'un service externe
        logger.exception("Échec de l'appel Gemini (génération de QCM)")
        raise AIGenerationError() from exc

    tokens_used = _extract_token_count(response)

    try:
        data = QCMGenerationSchema.model_validate(json.loads(response.text))
    except (ValueError, TypeError) as exc:
        logger.error("Réponse Gemini non conforme au schéma attendu : %s", str(response.text)[:500])
        raise AIGenerationError() from exc

    return data, tokens_used


def stream_tutor_reply(*, system_instruction: str, history: list[dict], user_message: str):
    """
    Générateur produisant la réponse du tuteur IA morceau par morceau (pour le
    streaming SSE — voir ai_engine/views.py::TutorChatView). Le dernier élément
    produit est toujours un tuple `("__usage__", tokens_utilisés)`.
    """
    contents = history + [{"role": "user", "parts": [{"text": user_message}]}]
    total_tokens = 0
    try:
        stream = get_client().models.generate_content_stream(
            model=settings.GEMINI_MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_instruction, temperature=0.6),
        )
        for chunk in stream:
            if getattr(chunk, "text", None):
                yield chunk.text
            usage = getattr(chunk, "usage_metadata", None)
            if usage and getattr(usage, "total_token_count", None):
                total_tokens = usage.total_token_count
    except Exception as exc:  # pragma: no cover - dépend d'un service externe
        logger.exception("Échec du streaming Gemini (tuteur IA)")
        raise AIGenerationError() from exc

    yield ("__usage__", total_tokens)


def _extract_token_count(response) -> int:
    usage = getattr(response, "usage_metadata", None)
    if usage is None:
        return 0
    return getattr(usage, "total_token_count", 0) or 0
