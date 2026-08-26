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
        # Supporte maintenant l'identifiant `email` (OTP par e-mail) ou
        # `phone_number` (legacy). Priorise l'e-mail si fourni.
        email = request.data.get("email")
        phone_number = request.data.get("phone_number")
        ident = email or phone_number
        if not ident:
            # Pas d'identifiant dans la requête : on laisse le serializer
            # valider et on ne throttlera pas ici.
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}
