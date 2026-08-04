"""
Module 5 : Back-office & Administration.

L'essentiel de la gestion (utilisateurs, suspension de comptes, catalogue des
concours, plans tarifaires) se fait via le panneau d'administration Django
sur `/admin/`, largement personnalisé dans chaque app (voir notamment
`apps/accounts/admin.py::UserAdmin` pour la suspension de comptes, et
`apps/payments/admin.py::TransactionAdmin` pour l'export CSV des revenus).

Ce module ajoute l'endpoint d'API que consommerait un futur tableau de bord
web dédié : les statistiques agrégées "tokens consommés vs revenus" exigées
par le cahier des charges.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_engine.models import CachedGeneration, QCMSession
from apps.payments.models import Transaction, TransactionStatus
from apps.quotas.models import TokenUsageLog
from common.permissions import IsAdminBackoffice

from .serializers import PlatformStatsSerializer

User = get_user_model()

# Coût indicatif utilisé UNIQUEMENT pour donner un ordre de grandeur dans le
# tableau de bord admin. Les tarifs Gemini évoluent régulièrement : ajuster
# cette constante (ou en faire un réglage back-office) selon le tarif courant
# sur https://ai.google.dev/gemini-api/docs/pricing et le ratio input/output
# réel de la plateforme.
ESTIMATED_COST_PER_1K_TOKENS_FCFA = 0.35


@extend_schema(tags=["Back-office"], responses={200: PlatformStatsSerializer})
class PlatformStatsView(APIView):
    """Statistiques globales de la plateforme, réservées au staff (Module 5)."""

    permission_classes = [IsAdminBackoffice]

    def get(self, request):
        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)

        total_tokens = TokenUsageLog.objects.aggregate(total=Sum("tokens_used"))["total"] or 0
        tokens_30d = (
            TokenUsageLog.objects.filter(created_at__gte=last_30_days).aggregate(total=Sum("tokens_used"))["total"]
            or 0
        )

        total_revenue = (
            Transaction.objects.filter(status=TransactionStatus.COMPLETED).aggregate(total=Sum("amount_fcfa"))[
                "total"
            ]
            or 0
        )
        revenue_30d = (
            Transaction.objects.filter(
                status=TransactionStatus.COMPLETED, created_at__gte=last_30_days
            ).aggregate(total=Sum("amount_fcfa"))["total"]
            or 0
        )

        total_sessions = QCMSession.objects.count()
        cache_hits = QCMSession.objects.filter(served_from_cache=True).count()
        cache_hit_rate = round((cache_hits / total_sessions) * 100, 1) if total_sessions else 0.0

        data = {
            "total_users": User.objects.count(),
            "active_premium_users": User.objects.filter(is_premium=True).count(),
            "new_users_last_7_days": User.objects.filter(created_at__gte=last_7_days).count(),
            "total_qcm_sessions": total_sessions,
            "cache_hit_rate_percent": cache_hit_rate,
            "total_cached_generations": CachedGeneration.objects.count(),
            "total_cache_hits_lifetime": CachedGeneration.objects.aggregate(total=Sum("hit_count"))["total"] or 0,
            "total_tokens_consumed": total_tokens,
            "total_tokens_consumed_last_30_days": tokens_30d,
            "estimated_ai_cost_fcfa_last_30_days": round(tokens_30d / 1000 * ESTIMATED_COST_PER_1K_TOKENS_FCFA, 2),
            "total_revenue_fcfa": float(total_revenue),
            "revenue_last_30_days_fcfa": float(revenue_30d),
        }
        return Response(PlatformStatsSerializer(data).data)
