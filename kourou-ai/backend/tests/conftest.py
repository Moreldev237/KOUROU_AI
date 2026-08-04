import pytest
from rest_framework.test import APIClient

from apps.exams.models import Exam, Subject, Topic
from apps.payments.models import SubscriptionPlan


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def exam(db):
    return Exam.objects.create(name="ENAM — Cycle A", code="enam-cycle-a", organizing_body="MINFOPRA")


@pytest.fixture
def subject(db, exam):
    return Subject.objects.create(exam=exam, name="Culture Générale", order=1)


@pytest.fixture
def topic(db, subject):
    return Topic.objects.create(
        subject=subject,
        name="Institutions de la République du Cameroun",
        syllabus_reference="Organisation des pouvoirs publics camerounais.",
        order=1,
    )


@pytest.fixture
def plan(db):
    return SubscriptionPlan.objects.create(
        code="mensuel-test",
        name="Pass Mensuel Test",
        billing_cycle="monthly",
        price_fcfa=2500,
        duration_days=30,
    )


@pytest.fixture
def registered_user(db):
    """Crée un utilisateur actif (inscription par e-mail = pas d'étape OTP)."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(email="candidat@example.cm", password="motdepasse123", full_name="Candidat Test")
    return user


@pytest.fixture
def auth_client(api_client, registered_user):
    """Client DRF déjà authentifié (JWT) en tant que `registered_user`."""
    from rest_framework_simplejwt.tokens import RefreshToken

    token = RefreshToken.for_user(registered_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")
    return api_client
