from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0009_recipe_suggested_sauces_recipe_suggested_sides"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RecipeImportJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_url", models.URLField()),
                ("platform", models.CharField(choices=[("instagram", "Instagram"), ("tiktok", "TikTok")], max_length=20)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("running", "Running"), ("done", "Done"), ("failed", "Failed")], default="queued", max_length=16)),
                ("media_file", models.FileField(blank=True, upload_to="recipe_imports/media/")),
                ("audio_file", models.FileField(blank=True, upload_to="recipe_imports/audio/")),
                ("transcript", models.TextField(blank=True)),
                ("extracted_recipe", models.JSONField(blank=True, default=dict)),
                ("celery_task_id", models.CharField(blank=True, max_length=255)),
                ("file_size_bytes", models.PositiveBigIntegerField(blank=True, null=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("error_code", models.CharField(blank=True, max_length=64)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipe_import_jobs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
    ]
