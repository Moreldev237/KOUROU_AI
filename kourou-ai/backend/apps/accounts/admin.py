from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .forms import UserCreationForm
from .models import OTPCode, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    add_form = UserCreationForm
    ordering = ["-created_at"]
    list_display = [
        "phone_number",
        "email",
        "full_name",
        "target_exam",
        "is_premium",
        "phone_verified",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_premium", "phone_verified", "is_active", "study_level", "target_exam"]
    search_fields = ["phone_number", "email", "full_name"]
    readonly_fields = ["id", "created_at", "updated_at", "last_login"]
    fieldsets = (
        (None, {"fields": ("id", "phone_number", "email", "password")}),
        ("Profil", {"fields": ("full_name", "target_exam", "study_level")}),
        (
            "Statut",
            {
                "fields": (
                    "is_premium",
                    "phone_verified",
                    "email_verified",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
        ("Suspension (Module 5 — abus)", {"fields": ("suspended_at", "suspension_reason")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Dates", {"fields": ("created_at", "updated_at", "last_login")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("phone_number", "email", "password1", "password2")}),
    )
    actions = ["suspend_users", "reactivate_users"]

    @admin.action(description="Suspendre les comptes sélectionnés (abus)")
    def suspend_users(self, request, queryset):
        for user in queryset:
            user.suspend(reason=f"Suspendu manuellement par {request.user}")

    @admin.action(description="Réactiver les comptes sélectionnés")
    def reactivate_users(self, request, queryset):
        for user in queryset:
            user.reactivate()


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ["user", "purpose", "created_at", "expires_at", "consumed_at", "attempts"]
    list_filter = ["purpose"]
    search_fields = ["user__phone_number", "user__email"]
    readonly_fields = [f.name for f in OTPCode._meta.fields]

    def has_add_permission(self, request):
        # Les OTP ne sont créés que par le backend, jamais manuellement.
        return False
