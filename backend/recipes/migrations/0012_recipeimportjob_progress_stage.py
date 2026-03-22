from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0011_alter_recipeimportjob_platform"),
    ]

    operations = [
        migrations.AddField(
            model_name="recipeimportjob",
            name="progress_stage",
            field=models.CharField(
                choices=[
                    ("queued", "Queued"),
                    ("downloading", "Downloading"),
                    ("parsing", "Parsing"),
                    ("verifying", "Verifying"),
                    ("done", "Done"),
                    ("failed", "Failed"),
                ],
                default="queued",
                max_length=16,
            ),
        ),
    ]
