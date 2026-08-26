from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.exams.models import Exam
from common.exceptions import AccountSuspendedException, InvalidOTPException

from . import services
from .models import OTPPurpose, StudyLevel, normalize_phone_number

User = get_user_model()


class PhoneNormalizationMixin:
    """
    Normalise systématiquement `phone_number` au format +237XXXXXXXXX avant
    toute validation au niveau objet. Sans cela, un candidat qui s'inscrit
    avec "677123456" puis vérifie son OTP avec la même saisie (sans l'indicatif
    que `User.save()` ajoute automatiquement à l'enregistrement) ne serait
    jamais retrouvé en base : `User.objects.get(phone_number=...)` chercherait
    la valeur brute au lieu de la valeur réellement stockée.
    """

    def validate_phone_number(self, value):
        return normalize_phone_number(value)


def tokens_for_user(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class ReferralUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "phone_number", "email"]


class UserProfileSerializer(PhoneNormalizationMixin, serializers.ModelSerializer):
    target_exam_name = serializers.CharField(source="target_exam.name", read_only=True, default=None)
    referrer = serializers.CharField(source="referred_by.full_name", read_only=True, allow_null=True)
    referred_users = ReferralUserSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "phone_number",
            "email",
            "full_name",
            "target_exam",
            "target_exam_name",
            "study_level",
            "is_premium",
            "is_staff",
            "phone_verified",
            "email_verified",
            "referrer",
            "referred_users",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "is_premium",
            "is_staff",
            "phone_verified",
            "email_verified",
            "created_at",
        ]


class AuthTokenResponseSerializer(serializers.Serializer):
    """Forme de réponse renvoyée après une connexion/inscription/vérification OTP réussie."""

    user = UserProfileSerializer()
    access = serializers.CharField()
    refresh = serializers.CharField()


class RegisterPendingOTPResponseSerializer(serializers.Serializer):
    """Forme de réponse renvoyée quand l'inscription par téléphone attend une vérification OTP."""

    message = serializers.CharField()
    email = serializers.CharField()
    requires_otp = serializers.BooleanField()


class MessageResponseSerializer(serializers.Serializer):
    message = serializers.CharField()


class RegisterSerializer(PhoneNormalizationMixin, serializers.Serializer):
    phone_number = serializers.CharField(required=False, allow_blank=False)
    email = serializers.EmailField(required=False, allow_blank=False)
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(max_length=150)
    target_exam = serializers.PrimaryKeyRelatedField(
        queryset=Exam.objects.filter(is_active=True), required=False, allow_null=True
    )
    study_level = serializers.ChoiceField(choices=StudyLevel.choices, required=False)

    referrer = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        if not attrs.get("phone_number") and not attrs.get("email"):
            raise serializers.ValidationError("Fournissez un numéro de téléphone ou un e-mail.")
        if attrs.get("phone_number") and User.objects.filter(phone_number=attrs["phone_number"]).exists():
            raise serializers.ValidationError({"phone_number": "Ce numéro est déjà utilisé."})
        if attrs.get("email") and User.objects.filter(email__iexact=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "Cet e-mail est déjà utilisé."})

        referrer = None
        if attrs.get("referrer"):
            raw_referrer = attrs["referrer"].strip()
            if "@" in raw_referrer:
                referrer = User.objects.filter(email__iexact=raw_referrer).first()
                if referrer is None:
                    raise serializers.ValidationError({"referrer": "Aucun parrain trouvé pour cet e-mail."})
            else:
                phone_number = normalize_phone_number(raw_referrer)
                referrer = User.objects.filter(phone_number=phone_number).first()
                if referrer is None:
                    raise serializers.ValidationError({"referrer": "Aucun parrain trouvé pour ce numéro."})

        attrs["referrer_obj"] = referrer
        return attrs

    def create(self, validated_data):
        referrer = validated_data.pop("referrer_obj", None)
        validated_data.pop("referrer", None)
        password = validated_data.pop("password")
        is_email_registration = bool(validated_data.get("email"))
        user = User(**validated_data)
        user.referred_by = referrer
        user.set_password(password)
        # Si l'inscription fournit un e-mail, on déclenche le flux OTP par e-mail
        # (compte inactif tant que l'email n'est pas vérifié). Si aucun e-mail
        # n'est fourni (inscription par téléphone uniquement), le compte est
        # activé immédiatement et le téléphone est considéré comme vérifié.
        if is_email_registration:
            user.is_active = False
            user.save()
            services.generate_otp_code(user, OTPPurpose.REGISTRATION)
        else:
            user.is_active = True
            if validated_data.get("phone_number"):
                user.phone_verified = True
            user.save()
        return user


class VerifyOTPSerializer(PhoneNormalizationMixin, serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        try:
            user = User.objects.get(email__iexact=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "Aucun compte associé à cet e-mail."})
        if not services.verify_otp_code(user, attrs["code"], OTPPurpose.REGISTRATION):
            raise InvalidOTPException()
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.is_active = True
        user.email_verified = True
        user.save(update_fields=["is_active", "email_verified"])
        return user


class ResendOTPSerializer(PhoneNormalizationMixin, serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=OTPPurpose.choices, default=OTPPurpose.REGISTRATION)

    def validate(self, attrs):
        try:
            attrs["user"] = User.objects.get(email__iexact=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "Aucun compte associé à cet e-mail."})
        return attrs

    def save(self, **kwargs):
        services.generate_otp_code(self.validated_data["user"], self.validated_data["purpose"])


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(help_text="Adresse e-mail")
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(request=request, username=attrs["email"], password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Identifiants invalides.")
        if not user.is_active:
            if user.suspended_at:
                raise AccountSuspendedException()
            raise serializers.ValidationError(
                "Compte non activé. Vérifiez le code de vérification envoyé lors de l'inscription."
            )
        attrs["user"] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        # On ne révèle jamais si l'email existe ou non (anti-énumération de comptes).
        attrs["user"] = User.objects.filter(email__iexact=attrs["email"]).first()
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        if user is not None:
            services.generate_otp_code_for_password_reset(user)


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs["email"]).first()
        if user is None or not services.verify_otp_code(user, attrs["code"], OTPPurpose.PASSWORD_RESET):
            raise InvalidOTPException()
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
