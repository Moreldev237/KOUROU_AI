"""
Interface commune à toute passerelle de paiement Mobile Money.

Le cahier des charges laisse le choix de l'agrégateur (Monetbil / Notch Pay /
CinetPay) : cette abstraction permet d'en changer — ou d'en ajouter un second
— sans toucher au reste du projet. Pour ajouter Monetbil ou Notch Pay, il
suffit d'implémenter cette interface dans un nouveau fichier de ce dossier
(ex: gateways/monetbil.py) et de l'enregistrer dans gateways/__init__.py.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class InitiationResult:
    payment_url: str
    provider_transaction_id: str
    raw_response: dict


@dataclass
class VerificationResult:
    is_successful: bool
    provider_status: str
    raw_response: dict


class PaymentGateway(ABC):
    @abstractmethod
    def initiate_payment(self, *, transaction) -> InitiationResult:
        """Démarre un paiement et renvoie l'URL à ouvrir côté mobile (WebView / navigateur)."""

    @abstractmethod
    def verify_transaction(self, *, provider_transaction_id: str) -> VerificationResult:
        """
        Interroge la passerelle EN SERVEUR À SERVEUR pour connaître le vrai
        statut d'une transaction. Ne jamais faire confiance au contenu brut
        d'un webhook de notification pour créditer un paiement.
        """
