from django.conf import settings

from .base import PaymentGateway
from .kpay import KPayGateway

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
        "kpay": KPayGateway,
    }
    gateway_cls = gateways.get(settings.PAYMENT_GATEWAY)
    if gateway_cls is None:
        raise ValueError(f"Passerelle de paiement inconnue : {settings.PAYMENT_GATEWAY!r}")
    return gateway_cls()
