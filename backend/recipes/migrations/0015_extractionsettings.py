from django.conf import settings
from django.db import migrations, models


def seed_initial_extraction_settings(apps, schema_editor):
    ExtractionSettings = apps.get_model("recipes", "ExtractionSettings")
    if ExtractionSettings.objects.exists():
        return

    ExtractionSettings.objects.create(
        ollama_model=getattr(settings, "OLLAMA_DEFAULT_MODEL", "llama3.2"),
        vosk_model_path=getattr(settings, "VOSK_MODEL_PATH", "") or "",
    )


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "0014_recipeimportjob_persist_media"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExtractionSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ollama_model", models.CharField(max_length=255)),
                ("vosk_model_path", models.CharField(max_length=1024)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name_plural": "Extraction settings"},
        ),
        migrations.RunPython(seed_initial_extraction_settings, migrations.RunPython.noop),
    ]
