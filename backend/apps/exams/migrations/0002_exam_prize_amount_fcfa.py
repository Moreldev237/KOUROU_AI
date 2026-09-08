from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("exams", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="prize_amount_fcfa",
            field=models.PositiveIntegerField(
                blank=True,
                default=0,
                help_text="Montant du prix attribué au gagnant, en FCFA.",
            ),
        ),
    ]
