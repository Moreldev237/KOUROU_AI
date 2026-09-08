from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("payments", "0004_switch_to_kpay")]

    operations = [
        migrations.AddField(
            model_name="subscriptionplan",
            name="google_drive_url",
            field=models.URLField(
                blank=True,
                help_text="Lien partagé Google Drive vers le support de formation débloqué après paiement.",
            ),
        ),
    ]