from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from common.throttling import PhoneNumberRateThrottle

from . import serializers as s


@extend_schema(
    tags=["Authentification"],
    request=s.RegisterSerializer,
    responses={201: s.AuthTokenResponseSerializer},
    description=(
        "Inscription par téléphone (Mobile Money) ou e-mail/mot de passe. "
        "Si l'inscription fournit un e-mail, la réponse peut renvoyer `requires_otp: true` "
        "et `email` pour attendre la vérification par e-mail. Si l'inscription ne fournit "
        "pas d'e-mail (inscription par téléphone uniquement), le compte est activé immédiatement."
    ),
)
class RegisterView(generics.CreateAPIView):
    """Inscription par téléphone (Mobile Money, avec OTP) ou par e-mail/mot de passe."""

    serializer_class = s.RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Si l'inscription nécessite une vérification OTP par e-mail, renvoyer
        # une réponse indiquant que la vérification est nécessaire.
        if user.email and not user.email_verified:
            return Response(
                {
                    "message": "Inscription reçue. Un code de vérification a été envoyé par e-mail.",
                    "email": user.email,
                    "requires_otp": True,
                },
                status=status.HTTP_201_CREATED,
            )

        tokens = s.tokens_for_user(user)
        return Response(
            {
                "message": "Compte créé avec succès.",
                "user": s.UserProfileSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Authentification"], request=s.VerifyOTPSerializer, responses={200: s.AuthTokenResponseSerializer})
class VerifyOTPView(APIView):
    """Vérifie le code reçu et active le compte (connexion automatique)."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle, PhoneNumberRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        serializer = s.VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = s.tokens_for_user(user)
        return Response({"user": s.UserProfileSerializer(user).data, **tokens})


@extend_schema(tags=["Authentification"], request=s.ResendOTPSerializer, responses={200: s.MessageResponseSerializer})
class ResendOTPView(APIView):
    """Renvoie un nouveau code OTP (inscription, connexion ou reset mot de passe)."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle, PhoneNumberRateThrottle]
    throttle_scope = "otp"

    def post(self, request):
        serializer = s.ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Un nouveau code a été envoyé."})


@extend_schema(tags=["Authentification"], request=s.LoginSerializer, responses={200: s.AuthTokenResponseSerializer})
class LoginView(APIView):
    """Connexion par numéro de téléphone OU e-mail + mot de passe."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = s.LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = s.tokens_for_user(user)
        return Response({"user": s.UserProfileSerializer(user).data, **tokens})


@extend_schema(
    tags=["Authentification"],
    request=s.PasswordResetRequestSerializer,
    responses={200: s.MessageResponseSerializer},
)
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = s.PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Si cet e-mail existe, un code de réinitialisation a été envoyé."})


@extend_schema(
    tags=["Authentification"],
    request=s.PasswordResetConfirmSerializer,
    responses={200: s.MessageResponseSerializer},
)
class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = s.PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Mot de passe réinitialisé avec succès."})


@extend_schema(
    tags=["Authentification"],
    request=s.ChangePasswordSerializer,
    responses={200: s.MessageResponseSerializer},
)
class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        serializer = s.ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Mot de passe modifié avec succès."})


@extend_schema(tags=["Authentification"])
class MeView(generics.RetrieveUpdateAPIView):
    """Profil du candidat connecté (Module 1 : tableau de bord personnalisé)."""

    serializer_class = s.UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
