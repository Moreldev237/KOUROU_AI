import logging

from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler

logger = logging.getLogger("apps")


class QuotaExceededException(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = (
        "Vous avez atteint votre quota gratuit du jour. "
        "Passez à un abonnement pour continuer sans limite."
    )
    default_code = "quota_exceeded"


class PaymentGatewayError(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = (
        "La passerelle de paiement est momentanément indisponible. "
        "Réessayez dans quelques instants."
    )
    default_code = "payment_gateway_error"


class AIGenerationError(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Le moteur IA n'a pas pu générer de contenu pour le moment. Réessayez."
    default_code = "ai_generation_error"


class InvalidOTPException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Le code de vérification est invalide ou a expiré."
    default_code = "invalid_otp"


class AccountSuspendedException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Ce compte a été suspendu. Contactez le support KOUROU AI."
    default_code = "account_suspended"


def custom_exception_handler(exc, context):
    """
    Uniformise toutes les réponses d'erreur de l'API sous la forme :

        {"error": {"code": "...", "message": "...", "details": {...}}}

    afin que le client mobile n'ait qu'un seul format d'erreur à gérer, quel
    que soit le module qui a levé l'exception.
    """
    response = exception_handler(exc, context)

    if response is None:
        # Exception imprévue (bug) : on logue la trace complète côté serveur
        # mais on ne renvoie jamais de traceback brut au client.
        logger.exception("Exception non gérée sur %s", context.get("view"), exc_info=exc)
        return None

    error_code = getattr(exc, "default_code", None) or "error"

    if isinstance(response.data, dict):
        if "detail" in response.data:
            message = response.data["detail"]
            details = {k: v for k, v in response.data.items() if k != "detail"}
        else:
            # Extraire le premier message d'erreur de validation disponible.
            message = "Une erreur de validation est survenue."
            for value in response.data.values():
                if isinstance(value, list) and value and isinstance(value[0], str):
                    message = value[0]
                    break
                if isinstance(value, str):
                    message = value
                    break
            details = response.data
    else:
        message = "Une erreur de validation est survenue."
        details = response.data

    response.data = {
        "error": {
            "code": str(error_code),
            "message": str(message),
            "details": details,
        }
    }
    return response
