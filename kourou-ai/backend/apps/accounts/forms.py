from django.contrib.auth.forms import UserCreationForm as BaseUserCreationForm

from .models import User


class UserCreationForm(BaseUserCreationForm):
    """
    Le `UserCreationForm` de Django référence en dur un champ `username`, qui
    n'existe pas sur notre modèle (on utilise `phone_number`/`email`). On doit
    donc redéfinir `Meta.fields` pour pointer vers nos vrais champs, sans quoi
    l'admin Django plante à l'ouverture du formulaire de création.
    """

    class Meta(BaseUserCreationForm.Meta):
        model = User
        fields = ("phone_number", "email")
