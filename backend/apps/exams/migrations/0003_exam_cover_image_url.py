from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("exams", "0002_exam_prize_amount_fcfa")]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="cover_image_url",
            field=models.URLField(blank=True, help_text="Image de couverture du concours affichée dans les supports."),
        ),
    ]