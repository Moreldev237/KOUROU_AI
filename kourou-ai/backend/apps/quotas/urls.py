from django.urls import path

from . import views

app_name = "quotas"

urlpatterns = [
    path("me/", views.MyQuotaView.as_view(), name="my-quota"),
]
