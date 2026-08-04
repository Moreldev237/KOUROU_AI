from django.urls import path

from . import views

app_name = "backoffice"

urlpatterns = [
    path("stats/", views.PlatformStatsView.as_view(), name="stats"),
]
