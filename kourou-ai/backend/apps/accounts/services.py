import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import OTPCode, OTPPurpose

logger = logging.getLogger("apps")

OTP_VALIDITY_MINUTES = 10


def send_sms(to: str, message: str) -> None:
    """
    Abstraction d'envoi de SMS.

    En développement (SMS_BACKEND=console), le message est simplement journalisé
    pour pouvoir tester tout le parcours OTP sans fournisseur réel. Avant la
    mise en production, brancher ici un vrai fournisseur SMS camerounais (ou
    l'API SMS de votre agrégateur Mobile Money s'il en propose une) en ajoutant
    un nouveau backend, sur le même principe que `apps/payments/gateways/`.
    """
    if settings.SMS_BACKEND == "console":
        logger.info("[SMS -> %s] %s", to, message)
        return
    raise NotImplementedError(
        f"Backend SMS « {settings.SMS_BACKEND} » non implémenté. "
        "Ajoutez son implémentation dans apps/accounts/services.py."
    )


def send_email(to: str, subject: str, message: str) -> None:
    """
    Abstraction d'envoi d'email.
    
    En développement, le message est journalisé pour tester le flux.
    En production, utilise Django EMAIL_BACKEND configuré.
    """
    if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":
        logger.info("[EMAIL -> %s] Subject: %s\n%s", to, subject, message)
        return
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi d'email: {e}")
        raise


def generate_otp_code(user, purpose: str) -> OTPCode:
    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = OTPCode.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=OTP_VALIDITY_MINUTES),
    )

    if purpose == OTPPurpose.REGISTRATION and user.email:
        send_email(
            to=user.email,
            subject="KOUROU AI - Vérification de votre compte",
            message=(
                f"Bonjour {user.full_name},\n\n"
                f"Votre code de vérification est : {code}\n\n"
                f"Il expire dans {OTP_VALIDITY_MINUTES} minutes.\n\n"
                f"Si vous n'avez pas demandé ce code, ignorez ce message.\n\n"
                f"Cordialement,\nL'équipe KOUROU AI"
            ),
        )
    else:
        send_sms(
            to=user.phone_number,
            message=(
                f"KOUROU AI — Votre code de vérification est {code}. "
                f"Il expire dans {OTP_VALIDITY_MINUTES} minutes."
            ),
        )
    return otp


def generate_otp_code_for_password_reset(user) -> OTPCode:
    """Génère un code OTP pour la réinitialisation de mot de passe et l'envoie par email."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = OTPCode.objects.create(
        user=user,
        code=code,
        purpose="password_reset",
        expires_at=timezone.now() + timedelta(minutes=OTP_VALIDITY_MINUTES),
    )
    send_email(
        to=user.email,
        subject="KOUROU AI - Réinitialisation de votre mot de passe",
        message=(
            f"Bonjour {user.full_name},\n\n"
            f"Vous avez demandé la réinitialisation de votre mot de passe.\n\n"
            f"Votre code de vérification est : {code}\n\n"
            f"Ce code expire dans {OTP_VALIDITY_MINUTES} minutes.\n\n"
            f"Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\n"
            f"Cordialement,\nL'équipe KOUROU AI"
        ),
    )
    return otp


def verify_otp_code(user, code: str, purpose: str) -> bool:
    """Vérifie le code OTP le plus récent et non consommé pour cet utilisateur/usage."""
    otp = (
        OTPCode.objects.filter(user=user, purpose=purpose, consumed_at__isnull=True)
        .order_by("-created_at")
        .first()
    )
    if otp is None:
        return False

    otp.attempts += 1
    otp.save(update_fields=["attempts"])

    if not otp.is_valid or otp.code != code:
        return False

    otp.mark_consumed()
    return True
