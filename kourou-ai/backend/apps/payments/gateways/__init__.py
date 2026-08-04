from django.conf import settings

from .base import PaymentGateway
from .cinetpay import CinetPayGateway

__all__ = ["get_gateway", "PaymentGateway"]


def get_gateway() -> PaymentGateway:
    """
    Renvoie l'implémentation configurée via `settings.PAYMENT_GATEWAY`.

    Pour ajouter Monetbil ou Notch Pay : créer `gateways/monetbil.py` (ou
    `notchpay.py`) implémentant l'interface `PaymentGateway`, puis l'ajouter
    au dictionnaire ci-dessous. Aucun autre fichier du projet n'a besoin de
    changer.
    """
    gateways = {
        "cinetpay": CinetPayGateway,
        # "monetbil": MonetbilGateway,   # à implémenter sur le même modèle
        # "notchpay": NotchPayGateway,   # à implémenter sur le même modèle
    }
    gateway_cls = gateways.get(settings.PAYMENT_GATEWAY)
    if gateway_cls is None:
        raise ValueError(f"Passerelle de paiement inconnue : {settings.PAYMENT_GATEWAY!r}")
    return gateway_cls()
