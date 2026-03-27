from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "0013_recipeimportjob_download_only"),
    ]

    operations = [
        migrations.AddField(
            model_name="recipeimportjob",
            name="persist_media",
            field=models.BooleanField(default=False),
        ),
    ]
