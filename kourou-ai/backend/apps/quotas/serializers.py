from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import UserQuota


class UserQuotaSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()
    is_unlimited = serializers.BooleanField(source="user.is_premium", read_only=True)

    class Meta:
        model = UserQuota
        fields = ["daily_limit", "used_today", "remaining", "is_unlimited", "last_reset_date"]

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_remaining(self, obj):
        if obj.user.is_premium:
            return None
        return max(obj.daily_limit - obj.used_today, 0)
