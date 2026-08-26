import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferralReward",
            fields=[
                (
                    "id",
                    models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID"),
                ),
                (
                    "amount",
                    models.PositiveIntegerField(default=5),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "referrer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_rewards",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "referred_user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_reward_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "subscription",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_reward",
                        to="payments.subscription",
                    ),
                ),
            ],
            options={
                "db_table": "payments_referral_reward",
                "verbose_name": "Récompense de parrainage",
                "verbose_name_plural": "Récompenses de parrainage",
            },
        ),
    ]
