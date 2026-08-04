import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

# Numéro Camerounais : 6XXXXXXXX (9 chiffres, opérateur MTN/Orange/Nexttel),
# avec ou sans l'indicatif +237. On normalise ensuite à l'enregistrement.
phone_validator = RegexValidator(
    regex=r"^\+?237?6\d{8}$",
    message="Numéro invalide. Format attendu : 6XXXXXXXX ou +2376XXXXXXXX.",
)


def normalize_phone_number(raw: str) -> str:
    """Ramène un numéro camerounais à la forme canonique +2376XXXXXXXX."""
    digits = raw.strip().replace(" ", "")
    if digits.startswith("+237"):
        return digits
    if digits.startswith("237"):
        return f"+{digits}"
    if digits.startswith("6"):
        return f"+237{digits}"
    return digits


class StudyLevel(models.TextChoices):
    CEP = "cep", "CEP"
    BEPC = "bepc", "BEPC"
    BAC = "bac", "Baccalauréat"
    LICENCE = "licence", "Licence"
    MASTER = "master", "Master"
    AUTRE = "autre", "Autre"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, phone_number=None, email=None, password=None, **extra_fields):
        if not phone_number and not email:
            raise ValueError("Un numéro de téléphone ou un e-mail est requis.")
        if phone_number:
            phone_number = normalize_phone_number(phone_number)
        if email:
            email = self.normalize_email(email)
        user = self.model(phone_number=phone_number, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone_number=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone_number, email, password, **extra_fields)

    def create_superuser(self, phone_number=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("phone_verified", True)
        extra_fields.setdefault("email_verified", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superuser doit avoir is_superuser=True.")
        return self._create_user(phone_number, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Utilisateur personnalisé : connexion par numéro Mobile Money OU par e-mail.
    L'e-mail sert désormais d'identifiant principal pour l'authentification et
    la création des superusers, tandis que le numéro de téléphone reste
    disponible comme identifiant secondaire pour les flux mobile.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    phone_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        validators=[phone_validator],
        help_text="Numéro Mobile Money (MTN/Orange), identifiant de connexion principal.",
    )
    email = models.EmailField(unique=True, null=True, blank=True)

    full_name = models.CharField(max_length=150, blank=True)
    target_exam = models.ForeignKey(
        "exams.Exam",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="targeting_users",
        help_text="Concours visé par le candidat (ex : ENAM, Police, Douane).",
    )
    study_level = models.CharField(max_length=20, choices=StudyLevel.choices, default=StudyLevel.AUTRE)

    is_premium = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    suspended_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return self.full_name or self.phone_number or self.email or str(self.id)

    def save(self, *args, **kwargs):
        if self.phone_number:
            self.phone_number = normalize_phone_number(self.phone_number)
        super().save(*args, **kwargs)

    def suspend(self, reason: str = "") -> None:
        """Utilisé par le Module 5 (Back-office) pour bloquer un compte en cas d'abus."""
        self.is_active = False
        self.suspended_at = timezone.now()
        self.suspension_reason = reason
        self.save(update_fields=["is_active", "suspended_at", "suspension_reason"])

    def reactivate(self) -> None:
        self.is_active = True
        self.suspended_at = None
        self.suspension_reason = ""
        self.save(update_fields=["is_active", "suspended_at", "suspension_reason"])


class OTPPurpose(models.TextChoices):
    REGISTRATION = "registration", "Inscription"
    LOGIN = "login", "Connexion"
    PASSWORD_RESET = "password_reset", "Réinitialisation du mot de passe"


class OTPCode(models.Model):
    """Code à usage unique envoyé par email ou SMS (vérification de téléphone, reset mot de passe)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_codes")
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=OTPPurpose.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "accounts_otp_code"
        indexes = [models.Index(fields=["user", "purpose", "consumed_at"])]
        verbose_name = "Code OTP"
        verbose_name_plural = "Codes OTP"

    def __str__(self):
        return f"OTP({self.purpose}) pour {self.user}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        return self.consumed_at is None and not self.is_expired and self.attempts < 5

    def mark_consumed(self) -> None:
        self.consumed_at = timezone.now()
        self.save(update_fields=["consumed_at"])
