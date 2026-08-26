import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_alter_user_study_level"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="referred_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="referred_users",
                to=settings.AUTH_USER_MODEL,
                help_text="Parrain qui a invité ce candidat.",
            ),
        ),
    ]
