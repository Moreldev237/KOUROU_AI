from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsOwner(BasePermission):
    """Autorise l'accès à un objet uniquement à son propriétaire (ex: sa propre session de QCM)."""

    owner_field = "user"

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user


class IsStaffOrReadOnly(BasePermission):
    """Lecture pour tout utilisateur authentifié, écriture réservée au staff (back-office)."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_staff)


class IsAdminBackoffice(BasePermission):
    """Réservé aux comptes staff/admin — utilisé par le Module 5 (Back-office)."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
