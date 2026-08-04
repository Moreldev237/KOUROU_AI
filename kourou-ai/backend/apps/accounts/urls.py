from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("otp/verify/", views.VerifyOTPView.as_view(), name="otp-verify"),
    path("otp/resend/", views.ResendOTPView.as_view(), name="otp-resend"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("password-reset/request/", views.PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("me/", views.MeView.as_view(), name="me"),
]
