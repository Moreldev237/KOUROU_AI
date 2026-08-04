from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import UserQuotaSerializer


@extend_schema(tags=["Quotas"], responses={200: UserQuotaSerializer})
class MyQuotaView(APIView):
    """Quota gratuit journalier du candidat connecté (affiché en badge dans l'app mobile)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        quota = services.get_or_create_quota(request.user)
        return Response(UserQuotaSerializer(quota).data)
