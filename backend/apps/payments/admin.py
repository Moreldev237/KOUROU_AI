import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import ReferralReward, Subscription, SubscriptionPlan, Transaction


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "price_fcfa", "billing_cycle", "duration_days", "exam", "is_active", "order"]
    list_filter = ["billing_cycle", "is_active", "exam"]
    search_fields = ["name", "code"]
    fields = ["code", "name", "description", "google_drive_url", "exam", "billing_cycle", "price_fcfa", "duration_days", "is_unlimited_generation", "is_active", "order"]
    prepopulated_fields = {"code": ("name",)}
    actions = ["activate_plans", "deactivate_plans"]

    @admin.action(description="Activer les plans sélectionnés")
    def activate_plans(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} plan(s) activé(s).")

    @admin.action(description="Désactiver les plans sélectionnés")
    def deactivate_plans(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} plan(s) désactivé(s).")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "plan", "status", "start_date", "end_date", "is_active_now"]
    list_filter = ["status", "plan"]
    search_fields = ["user__phone_number", "user__email"]
    readonly_fields = ["start_date"]
    actions = ["activate_selected", "expire_selected", "cancel_selected"]

    @admin.action(description="Activer les abonnements sélectionnés")
    def activate_selected(self, request, queryset):
        updated = queryset.update(status="active")
        self.message_user(request, f"{updated} abonnement(s) activé(s).")

    @admin.action(description="Marquer les abonnements sélectionnés comme expirés")
    def expire_selected(self, request, queryset):
        updated = queryset.update(status="expired")
        self.message_user(request, f"{updated} abonnement(s) expiré(s).")

    @admin.action(description="Annuler les abonnements sélectionnés")
    def cancel_selected(self, request, queryset):
        updated = queryset.update(status="cancelled")
        self.message_user(request, f"{updated} abonnement(s) annulé(s).")


@admin.register(ReferralReward)
class ReferralRewardAdmin(admin.ModelAdmin):
    list_display = ["referrer", "referred_user", "amount", "created_at"]
    search_fields = ["referrer__email", "referrer__phone_number", "referred_user__email", "referred_user__phone_number"]
    readonly_fields = ["created_at"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["provider_transaction_id", "user", "plan", "amount_fcfa", "status", "gateway", "created_at"]
    list_filter = ["status", "gateway", "plan"]
    search_fields = ["provider_transaction_id", "user__phone_number", "user__email"]
    readonly_fields = ["id", "created_at", "updated_at", "raw_init_response", "raw_verification_response"]
    date_hierarchy = "created_at"
    actions = ["export_as_csv", "mark_selected_as_completed", "mark_selected_as_failed"]

    @admin.action(description="Marquer comme réussie")
    def mark_selected_as_completed(self, request, queryset):
        updated = queryset.update(status="completed")
        self.message_user(request, f"{updated} transaction(s) marquée(s) comme réussie(s).")

    @admin.action(description="Marquer comme échouée")
    def mark_selected_as_failed(self, request, queryset):
        updated = queryset.update(status="failed")
        self.message_user(request, f"{updated} transaction(s) marquée(s) comme échouée(s).")

    @admin.action(description="Exporter en CSV (rapport financier — Module 5)")
    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=transactions_kourou_ai.csv"
        writer = csv.writer(response)
        writer.writerow(["ID", "Utilisateur", "Plan", "Montant FCFA", "Statut", "Passerelle", "Date"])
        for txn in queryset.select_related("user", "plan"):
            writer.writerow(
                [
                    txn.provider_transaction_id,
                    str(txn.user),
                    txn.plan.name,
                    txn.amount_fcfa,
                    txn.status,
                    txn.gateway,
                    txn.created_at.isoformat(),
                ]
            )
        return response
