from rest_framework import serializers


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
