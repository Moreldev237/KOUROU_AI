from django.contrib import admin

from .models import TokenUsageLog, UserQuota


@admin.register(UserQuota)
class UserQuotaAdmin(admin.ModelAdmin):
    list_display = ["user", "used_today", "daily_limit", "last_reset_date"]
    search_fields = ["user__phone_number", "user__email"]
    readonly_fields = ["last_reset_date"]
    actions = ["reset_usage_for_today", "grant_extra_daily_quota"]

    @admin.action(description="Réinitialiser l'usage du jour")
    def reset_usage_for_today(self, request, queryset):
        updated = queryset.update(used_today=0)
        self.message_user(request, f"{updated} quota(s) réinitialisé(s).")

    @admin.action(description="Ajouter 10 unités de quota au jour")
    def grant_extra_daily_quota(self, request, queryset):
        updated = 0
        for quota in queryset:
            quota.used_today = max(0, quota.used_today - 10)
            quota.save(update_fields=["used_today"])
            updated += 1
        self.message_user(request, f"{updated} quota(s) ajusté(s) manuellement.")


@admin.register(TokenUsageLog)
class TokenUsageLogAdmin(admin.ModelAdmin):
    list_display = ["user", "endpoint", "tokens_used", "created_at"]
    list_filter = ["endpoint", "created_at"]
    search_fields = ["user__phone_number", "user__email"]
    date_hierarchy = "created_at"
    actions = ["clear_selected_logs"]

    @admin.action(description="Supprimer les logs sélectionnés")
    def clear_selected_logs(self, request, queryset):
        deleted, _ = queryset.delete()
        self.message_user(request, f"{deleted} log(s) supprimé(s).")

    def has_add_permission(self, request):
        return False
