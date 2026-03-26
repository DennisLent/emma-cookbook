from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "0012_recipeimportjob_progress_stage"),
    ]

    operations = [
        migrations.AddField(
            model_name="recipeimportjob",
            name="download_only",
            field=models.BooleanField(default=False),
        ),
    ]
