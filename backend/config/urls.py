"""
URLs racine de KOUROU AI.

Chaque module du cahier des charges est monté sous son propre préfixe
`/api/<module>/`, ce qui matérialise l'architecture modulaire du projet :
changer/retirer un module n'affecte que sa propre app et son propre fichier
`urls.py`.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # Module 1 — Authentification & Profils
    path("api/auth/", include("apps.accounts.urls")),

    # Catalogue des concours (ENAM, Police, Douane, ENS, ...) & programmes
    # Le router de l'app définit déjà exams/, subjects/, topics/ -> pas de
    # double préfixe ici (routes finales : /api/exams/, /api/subjects/, ...).
    path("api/", include("apps.exams.urls")),

    # Module 2 — Moteur de génération & entraînement IA
    path("api/ai/", include("apps.ai_engine.urls")),

    # Module 3 — Quotas & consommation de tokens
    path("api/quotas/", include("apps.quotas.urls")),

    # Module 4 — Paiement & abonnements (Mobile Money)
    path("api/payments/", include("apps.payments.urls")),

    # Module 5 — Back-office & administration
    path("api/backoffice/", include("apps.backoffice.urls")),

    # Documentation technique de l'API, générée automatiquement depuis le code
    # (satisfait l'exigence de "documentation des API" du cahier des charges).
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "KOUROU AI — Back-office"
admin.site.site_title = "KOUROU AI"
admin.site.index_title = "Administration de la plateforme"
