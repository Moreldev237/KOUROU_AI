from unittest.mock import patch

import pytest

from apps.ai_engine.models import QCMSession, UserAnswer
from apps.ai_engine.services import cache_service


def _seed_cache(exam, subject, question_count=3):
    payload = {
        "questions": [
            {
                "question_text": f"Question {i}",
                "choices": [{"key": k, "text": f"Choix {k}"} for k in "ABCD"],
                "correct_choice_key": "B",
                "explanation": "Parce que B est correct.",
            }
            for i in range(question_count)
        ]
    }
    cache_key = cache_service.build_cache_key(
        exam_id=exam.id, subject_id=subject.id, topic_id=None,
        mode="qcm_batch", difficulty="moyen", question_count=question_count,
    )
    cache_service.store_generated_payload(
        cache_key=cache_key, exam=exam, subject=subject, topic=None, mode="qcm_batch",
        difficulty="moyen", question_count=question_count, payload=payload, tokens_used=0,
    )
    return payload


@pytest.mark.django_db
class TestQCMGenerationCache:
    @patch("apps.ai_engine.services.generation_service.gemini_client.generate_qcm")
    def test_cache_hit_never_calls_gemini(self, mock_generate, auth_client, registered_user, exam, subject):
        _seed_cache(exam, subject, question_count=3)

        response = auth_client.post(
            "/api/ai/qcm/generate/",
            {"exam": exam.id, "subject": subject.id, "mode": "qcm_batch", "difficulty": "moyen", "question_count": 3},
            format="json",
        )

        assert response.status_code == 201
        assert response.data["served_from_cache"] is True
        assert len(response.data["questions"]) == 3
        mock_generate.assert_not_called()

    def test_cache_hit_consumes_one_quota_unit(self, auth_client, registered_user, exam, subject):
        _seed_cache(exam, subject)
        auth_client.post(
            "/api/ai/qcm/generate/",
            {"exam": exam.id, "subject": subject.id, "mode": "qcm_batch", "difficulty": "moyen", "question_count": 3},
            format="json",
        )
        response = auth_client.get("/api/quotas/me/")
        assert response.data["used_today"] == 1

    def test_generation_blocked_when_quota_exhausted(self, auth_client, registered_user, exam, subject):
        from apps.quotas import services as quota_services

        quota = quota_services.get_or_create_quota(registered_user)
        quota.used_today = quota.daily_limit
        quota.save(update_fields=["used_today"])

        response = auth_client.post(
            "/api/ai/qcm/generate/",
            {"exam": exam.id, "subject": subject.id, "mode": "qcm_batch", "difficulty": "moyen", "question_count": 3},
            format="json",
        )
        assert response.status_code == 429
        assert response.data["error"]["code"] == "quota_exceeded"


@pytest.mark.django_db
class TestSubmitAnswer:
    def test_submit_correct_answer(self, auth_client, registered_user, exam, subject):
        _seed_cache(exam, subject)
        session_resp = auth_client.post(
            "/api/ai/qcm/generate/",
            {"exam": exam.id, "subject": subject.id, "mode": "qcm_batch", "difficulty": "moyen", "question_count": 3},
            format="json",
        )
        session = QCMSession.objects.get(id=session_resp.data["id"])
        question = session.questions.order_by("order").first()

        response = auth_client.post(
            "/api/ai/qcm/answer/",
            {"question": question.id, "selected_choice_key": question.correct_choice_key},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["is_correct"] is True
        assert UserAnswer.objects.filter(question=question).exists()

    def test_cannot_answer_twice(self, auth_client, registered_user, exam, subject):
        _seed_cache(exam, subject)
        session_resp = auth_client.post(
            "/api/ai/qcm/generate/",
            {"exam": exam.id, "subject": subject.id, "mode": "qcm_batch", "difficulty": "moyen", "question_count": 3},
            format="json",
        )
        session = QCMSession.objects.get(id=session_resp.data["id"])
        question = session.questions.order_by("order").first()

        auth_client.post(
            "/api/ai/qcm/answer/", {"question": question.id, "selected_choice_key": "A"}, format="json"
        )
        response = auth_client.post(
            "/api/ai/qcm/answer/", {"question": question.id, "selected_choice_key": "B"}, format="json"
        )
        assert response.status_code == 400
