from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.exams.models import Exam
from apps.quotas.models import UserQuota

User = get_user_model()


class PlatformStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    active_premium_users = serializers.IntegerField()
    new_users_last_7_days = serializers.IntegerField()

    total_qcm_sessions = serializers.IntegerField()
    cache_hit_rate_percent = serializers.FloatField(help_text="% de sessions servies à coût nul par le cache.")
    total_cached_generations = serializers.IntegerField()
    total_cache_hits_lifetime = serializers.IntegerField()

    total_tokens_consumed = serializers.IntegerField()
    total_tokens_consumed_last_30_days = serializers.IntegerField()
    estimated_ai_cost_fcfa_last_30_days = serializers.FloatField()

    total_revenue_fcfa = serializers.FloatField()
    revenue_last_30_days_fcfa = serializers.FloatField()


class AdminUserListSerializer(serializers.ModelSerializer):
    quota_daily_limit = serializers.IntegerField(source="quota.daily_limit", read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone_number",
            "is_premium",
            "is_active",
            "suspended_at",
            "suspension_reason",
            "referred_by",
            "quota_daily_limit",
            "created_at",
        ]


class TopReferrerSerializer(serializers.ModelSerializer):
    referrals = serializers.IntegerField(read_only=True)
    reward_fcfa = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "phone_number", "referrals", "reward_fcfa"]


class AdminDashboardSerializer(serializers.Serializer):
    users = AdminUserListSerializer(many=True)
    premium_users = AdminUserListSerializer(many=True)
    suspended_users = AdminUserListSerializer(many=True)
    top_referrers = TopReferrerSerializer(many=True)


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "phone_number", "password", "is_active", "is_premium", "is_staff"]
        read_only_fields = ["id", "is_active", "is_premium", "is_staff"]

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet e-mail.")
        return value

    def validate_phone_number(self, value):
        if value and User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec ce numéro.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class AdminUserDeleteSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    user_id = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        email = attrs.get("email")
        phone_number = attrs.get("phone_number")
        user_id = attrs.get("user_id")

        if not any([email, phone_number, user_id]):
            raise serializers.ValidationError("Précisez un e-mail, un numéro ou un identifiant utilisateur.")

        queryset = User.objects.all()
        user = None
        if user_id:
            user = queryset.filter(id=user_id).first()
        elif email:
            user = queryset.filter(email__iexact=email).first()
        elif phone_number:
            user = queryset.filter(phone_number=phone_number).first()

        if user is None:
            raise serializers.ValidationError("Aucun utilisateur trouvé pour ces critères.")

        attrs["user"] = user
        return attrs


class GrantTokensSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    user_id = serializers.CharField(required=False, allow_blank=True)
    tokens = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        user = None
        if attrs.get("user_id"):
            user = User.objects.filter(id=attrs["user_id"]).first()
        elif attrs.get("email"):
            user = User.objects.filter(email__iexact=attrs["email"]).first()
        elif attrs.get("phone_number"):
            user = User.objects.filter(phone_number=attrs["phone_number"]).first()

        if user is None:
            raise serializers.ValidationError("Aucun utilisateur correspondant trouvé.")

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        quota, _ = UserQuota.objects.get_or_create(user=user, defaults={"daily_limit": 0})
        quota.daily_limit += int(self.validated_data["tokens"])
        quota.save(update_fields=["daily_limit"])
        return quota


class AdminExamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = [
            "id",
            "name",
            "code",
            "description",
            "organizing_body",
            "prize_amount_fcfa",
            "icon_emoji",
            "color_hex",
            "is_active",
        ]
        read_only_fields = ["id", "is_active"]
