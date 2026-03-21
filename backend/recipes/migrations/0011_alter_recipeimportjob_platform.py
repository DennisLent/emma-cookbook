from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0010_recipeimportjob"),
    ]

    operations = [
        migrations.AlterField(
            model_name="recipeimportjob",
            name="platform",
            field=models.CharField(
                choices=[
                    ("instagram", "Instagram"),
                    ("tiktok", "TikTok"),
                    ("youtube", "YouTube"),
                ],
                max_length=20,
            ),
        ),
    ]
