from rest_framework.throttling import SimpleRateThrottle


class PhoneNumberRateThrottle(SimpleRateThrottle):
    """
    Limite le nombre de requêtes par NUMÉRO DE TÉLÉPHONE plutôt que par IP.

    Utilisé sur les endpoints d'envoi d'OTP : sans cela, un abus pourrait
    distribuer ses requêtes sur plusieurs IP pour continuer à spammer un même
    numéro de SMS (et donc gonfler la facture SMS du projet).
    """

    scope = "otp"

    def get_cache_key(self, request, view):
        phone_number = request.data.get("phone_number")
        if not phone_number:
            # Pas de numéro dans la requête : on laisse la validation du
            # serializer s'en charger, ce throttle n'a rien à limiter ici.
            return None
        return self.cache_format % {"scope": self.scope, "ident": phone_number}
