from django.db import migrations


def create_exam_packs(apps, schema_editor):
    Exam = apps.get_model("exams", "Exam")
    SubscriptionPlan = apps.get_model("payments", "SubscriptionPlan")

    for exam in Exam.objects.filter(is_active=True):
        SubscriptionPlan.objects.get_or_create(
            code=f"pack-{exam.code}",
            defaults={
                "name": f"Pack Concours {exam.name}",
                "description": f"Accès illimité de 60 jours, ciblé sur le programme du concours {exam.name}.",
                "exam_id": exam.id,
                "billing_cycle": "one_time",
                "price_fcfa": 4000,
                "duration_days": 60,
                "is_unlimited_generation": True,
                "is_active": True,
                "order": 100,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("payments", "0002_add_referral_reward")]
    operations = [migrations.RunPython(create_exam_packs, migrations.RunPython.noop)]