from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0008_alter_recipeingredient_options_comment_updated_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="recipe",
            name="suggested_sauces",
            field=models.ManyToManyField(
                blank=True,
                related_name="recommended_with_as_sauce",
                symmetrical=False,
                to="recipes.recipe",
            ),
        ),
        migrations.AddField(
            model_name="recipe",
            name="suggested_sides",
            field=models.ManyToManyField(
                blank=True,
                related_name="recommended_with_as_side",
                symmetrical=False,
                to="recipes.recipe",
            ),
        ),
    ]
