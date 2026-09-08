from django.urls import path

from . import views

app_name = "backoffice"

urlpatterns = [
    path("stats/", views.PlatformStatsView.as_view(), name="stats"),
    path("dashboard/", views.AdminDashboardView.as_view(), name="dashboard"),
    path("users/", views.AdminUserCreateView.as_view(), name="admin-users-create"),
    path("users/delete/", views.AdminUserDeleteView.as_view(), name="admin-users-delete"),
    path("users/<uuid:user_id>/", views.AdminUserDeleteByIdView.as_view(), name="admin-users-delete-id"),
    path("tokens/grant/", views.GrantTokensView.as_view(), name="admin-grant-tokens"),
    path("exams/", views.AdminExamCreateView.as_view(), name="admin-exams-create"),
]
