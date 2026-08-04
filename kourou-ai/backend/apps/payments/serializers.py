from rest_framework import serializers

from .models import Subscription, SubscriptionPlan, Transaction


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source="exam.name", read_only=True, default=None)

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "code",
            "name",
            "description",
            "exam",
            "exam_name",
            "billing_cycle",
            "price_fcfa",
            "duration_days",
            "is_unlimited_generation",
        ]


class CinetPayWebhookSerializer(serializers.Serializer):
    """Payload envoyé par CinetPay sur `notify_url` (voir gateways/cinetpay.py pour le détail sécurité)."""

    cpm_trans_id = serializers.CharField()


class InitiatePaymentRequestSerializer(serializers.Serializer):
    plan = serializers.PrimaryKeyRelatedField(queryset=SubscriptionPlan.objects.filter(is_active=True))


class TransactionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)

    class Meta:
        model = Transaction
        fields = ["id", "plan", "plan_name", "amount_fcfa", "status", "payment_url", "created_at"]
        read_only_fields = fields


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)

    class Meta:
        model = Subscription
        fields = ["id", "plan", "plan_name", "status", "start_date", "end_date"]
