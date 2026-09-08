from rest_framework import serializers

from .models import Subscription, SubscriptionPlan, Transaction


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source="exam.name", read_only=True, default=None)
    exam_category = serializers.CharField(source="exam.organizing_body", read_only=True, default=None)
    exam_cover_image = serializers.URLField(source="exam.cover_image_url", read_only=True, default=None)

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "code",
            "name",
            "description",
            "exam",
            "exam_name",
            "exam_category",
            "exam_cover_image",
            "billing_cycle",
            "price_fcfa",
            "duration_days",
            "is_unlimited_generation",
        ]


class KPayWebhookSerializer(serializers.Serializer):
    paymentId = serializers.CharField(required=False)
    externalId = serializers.CharField(required=False)
    status = serializers.CharField(required=False)


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


class UnlockedPackSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="name", read_only=True)
    access_until = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = ["id", "code", "plan_name", "description", "google_drive_url", "access_until"]

    def get_access_until(self, plan):
            return plan.access_until.isoformat()
