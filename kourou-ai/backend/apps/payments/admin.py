import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import Subscription, SubscriptionPlan, Transaction


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "price_fcfa", "billing_cycle", "duration_days", "exam", "is_active", "order"]
    list_filter = ["billing_cycle", "is_active"]
    search_fields = ["name", "code"]
    prepopulated_fields = {"code": ("name",)}


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "plan", "status", "start_date", "end_date"]
    list_filter = ["status", "plan"]
    search_fields = ["user__phone_number", "user__email"]
    readonly_fields = ["start_date"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["provider_transaction_id", "user", "plan", "amount_fcfa", "status", "created_at"]
    list_filter = ["status", "gateway"]
    search_fields = ["provider_transaction_id", "user__phone_number", "user__email"]
    readonly_fields = ["id", "created_at", "updated_at", "raw_init_response", "raw_verification_response"]
    date_hierarchy = "created_at"
    actions = ["export_as_csv"]

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
