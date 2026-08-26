import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import OTPCode, OTPPurpose

User = get_user_model()


def test_superuser_username_field_uses_email():
    assert User.USERNAME_FIELD == "email"


@pytest.mark.django_db
class TestRegistration:
    def test_register_by_email_is_immediately_active(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {"email": "nouveau@example.cm", "password": "motdepasse123", "full_name": "Nouveau Candidat"},
            format="json",
        )
        assert response.status_code == 201
        assert "access" in response.data
        assert response.data["user"]["email"] == "nouveau@example.cm"

    def test_register_by_phone_requires_otp(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {"phone_number": "677123456", "password": "motdepasse123", "full_name": "Candidat Mobile"},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["requires_otp"] is True
        assert "access" not in response.data

        user = User.objects.get(phone_number="+237677123456")
        assert user.is_active is False
        assert OTPCode.objects.filter(user=user, purpose=OTPPurpose.REGISTRATION).exists()

    def test_register_without_phone_or_email_is_rejected(self, api_client):
        response = api_client.post(
            "/api/auth/register/", {"password": "motdepasse123", "full_name": "Sans Identifiant"}, format="json"
        )
        assert response.status_code == 400

    def test_duplicate_email_is_rejected(self, api_client, registered_user):
        response = api_client.post(
            "/api/auth/register/",
            {"email": registered_user.email, "password": "autremotdepasse", "full_name": "Doublon"},
            format="json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestOTPVerification:
    def test_verify_correct_otp_activates_account_and_returns_tokens(self, api_client):
        api_client.post(
            "/api/auth/register/",
            {"phone_number": "677654321", "password": "motdepasse123", "full_name": "Candidat OTP"},
            format="json",
        )
        user = User.objects.get(phone_number="+237677654321")
        otp = OTPCode.objects.get(user=user, purpose=OTPPurpose.REGISTRATION)

        response = api_client.post(
            "/api/auth/otp/verify/", {"phone_number": "677654321", "code": otp.code}, format="json"
        )
        assert response.status_code == 200
        assert "access" in response.data

        user.refresh_from_db()
        assert user.is_active is True
        assert user.phone_verified is True

    def test_verify_wrong_otp_is_rejected(self, api_client):
        api_client.post(
            "/api/auth/register/",
            {"phone_number": "677111222", "password": "motdepasse123", "full_name": "Candidat OTP"},
            format="json",
        )
        response = api_client.post(
            "/api/auth/otp/verify/", {"phone_number": "677111222", "code": "000000"}, format="json"
        )
        assert response.status_code == 400
        assert response.data["error"]["code"] == "invalid_otp"


@pytest.mark.django_db
class TestLogin:
    def test_login_with_email(self, api_client, registered_user):
        response = api_client.post(
            "/api/auth/login/", {"email": registered_user.email, "password": "motdepasse123"}, format="json"
        )
        assert response.status_code == 200
        assert "access" in response.data

    def test_login_with_wrong_password_is_rejected(self, api_client, registered_user):
        response = api_client.post(
            "/api/auth/login/", {"email": registered_user.email, "password": "mauvais-mot-de-passe"},
            format="json",
        )
        assert response.status_code == 400
        assert response.data["error"]["message"] == "Identifiants invalides."
        assert response.data["error"]["code"] == "invalid"

    def test_login_with_phone_number_is_rejected(self, api_client):
        User.objects.create_user(phone_number="677999888", password="motdepasse123", is_active=True)
        response = api_client.post(
            "/api/auth/login/", {"email": "677999888", "password": "motdepasse123"}, format="json"
        )
        assert response.status_code == 400

    def test_me_requires_authentication(self, api_client):
        response = api_client.get("/api/auth/me/")
        assert response.status_code == 401

    def test_me_returns_profile_when_authenticated(self, auth_client, registered_user):
        response = auth_client.get("/api/auth/me/")
        assert response.status_code == 200
        assert response.data["email"] == registered_user.email
