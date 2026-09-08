from django.urls import path

from . import views

app_name = "payments"

urlpatterns = [
    path("plans/", views.SubscriptionPlanListView.as_view(), name="plans"),
    path("initiate/", views.InitiatePaymentView.as_view(), name="initiate"),
    path("webhook/kpay/", views.PaymentWebhookView.as_view(), name="webhook-kpay"),
    path("transactions/", views.TransactionHistoryView.as_view(), name="transactions"),
    path("subscription/me/", views.MySubscriptionView.as_view(), name="my-subscription"),
    path("packs/me/", views.MyUnlockedPacksView.as_view(), name="my-unlocked-packs"),
]
