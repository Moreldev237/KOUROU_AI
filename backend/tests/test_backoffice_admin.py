from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.exams.models import Exam

User = get_user_model()


def _staff_client():
    client = APIClient()
    admin = User.objects.create_superuser(
        email="admin@kourou.ai",
        phone_number="+237600000001",
        password="SecurePass123!",
        full_name="Admin Test",
    )
    token = RefreshToken.for_user(admin)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return client, admin


def test_staff_can_create_user_via_admin_action(db):
    client, _ = _staff_client()

    response = client.post(
        "/api/backoffice/users/",
        {
            "full_name": "Nouveau Candidat",
            "email": "newuser@example.com",
            "phone_number": "+237690000001",
            "password": "Pass123456",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert User.objects.filter(email="newuser@example.com").exists()


def test_staff_can_grant_tokens_to_user(db):
    client, _ = _staff_client()
    user = User.objects.create_user(
        email="candidate@example.com",
        phone_number="+237690000002",
        password="Pass123456",
        full_name="Candidat Test",
    )

    response = client.post(
        "/api/backoffice/tokens/grant/",
        {"email": "candidate@example.com", "tokens": 25},
        format="json",
    )

    assert response.status_code == 200, response.data
    user.refresh_from_db()
    assert user.quota.daily_limit == 25


def test_staff_can_create_exam_via_admin_action(db):
    client, _ = _staff_client()

    response = client.post(
        "/api/backoffice/exams/",
        {
            "name": "Concours Test",
            "organizing_body": "Ministère du Test",
            "prize_amount_fcfa": 500000,
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    exam = Exam.objects.get(name="Concours Test")
    assert exam.prize_amount_fcfa == 500000


def test_staff_can_fetch_real_admin_directory(db):
    client, _ = _staff_client()
    referrer = User.objects.create_user(
        email="referrer@example.com",
        phone_number="+237690000010",
        password="Pass123456",
        full_name="Parrain Test",
    )
    premium_user = User.objects.create_user(
        email="premium@example.com",
        phone_number="+237690000011",
        password="Pass123456",
        full_name="Premium Test",
        is_premium=True,
    )
    suspended_user = User.objects.create_user(
        email="suspended@example.com",
        phone_number="+237690000012",
        password="Pass123456",
        full_name="Suspendu Test",
    )
    suspended_user.suspend(reason="Abus détecté")
    User.objects.create_user(
        email="filleul@example.com",
        phone_number="+237690000013",
        password="Pass123456",
        full_name="Filleul Test",
        referred_by=referrer,
    )

    response = client.get("/api/backoffice/dashboard/")

    assert response.status_code == 200, response.data
    payload = response.json()
    assert len(payload["users"]) >= 4
    assert any(item["email"] == "premium@example.com" for item in payload["premium_users"])
    assert any(item["email"] == "suspended@example.com" for item in payload["suspended_users"])
    assert any(item["full_name"] == "Parrain Test" for item in payload["top_referrers"])
