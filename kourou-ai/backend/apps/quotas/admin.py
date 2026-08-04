from django.contrib import admin

from .models import TokenUsageLog, UserQuota


@admin.register(UserQuota)
class UserQuotaAdmin(admin.ModelAdmin):
    list_display = ["user", "used_today", "daily_limit", "last_reset_date"]
    search_fields = ["user__phone_number", "user__email"]
    readonly_fields = ["last_reset_date"]


@admin.register(TokenUsageLog)
class TokenUsageLogAdmin(admin.ModelAdmin):
    list_display = ["user", "endpoint", "tokens_used", "created_at"]
    list_filter = ["endpoint"]
    search_fields = ["user__phone_number", "user__email"]
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False
