from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

from .models import normalize_phone_number

User = get_user_model()


class PhoneOrEmailBackend(ModelBackend):
    """
    Authentifie uniquement par e-mail et mot de passe.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = username or kwargs.get("email")
        if identifier is None or password is None:
            return None
        try:
            user = User.objects.get(email__iexact=identifier)
        except User.DoesNotExist:
            # On exécute quand même un hachage de mot de passe factice pour
            # limiter les attaques par mesure de temps (timing attacks).
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
