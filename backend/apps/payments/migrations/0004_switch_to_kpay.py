from django.db import migrations, models


def switch_existing_transactions(apps, schema_editor):
    Transaction = apps.get_model("payments", "Transaction")
    Transaction.objects.filter(gateway="cinetpay").update(gateway="kpay")


class Migration(migrations.Migration):
    dependencies = [("payments", "0003_create_exam_packs")]

    operations = [
        migrations.RunPython(switch_existing_transactions, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="transaction",
            name="gateway",
            field=models.CharField(default="kpay", max_length=30),
        ),
    ]