from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management.base import CommandError
from django.test import TestCase

from recipes.models import Ingredient, Recipe, RecipeStep, Tag
from users.management import seed_helpers


class FakeScraper:
    def __init__(self, title, description, instructions, ingredients, yields_value="4 servings", image_url=""):
        self._title = title
        self._description = description
        self._instructions = instructions
        self._ingredients = ingredients
        self._yields_value = yields_value
        self._image_url = image_url

    def title(self):
        return self._title

    def description(self):
        return self._description

    def instructions(self):
        return self._instructions

    def ingredients(self):
        return self._ingredients

    def yields(self):
        return self._yields_value

    def image(self):
        return self._image_url


class SeedHelperTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="owner", password="secret")
        self.seed_entries = [
            {"url": "https://example.com/main", "kind": "main", "extra_tags": ["Dinner"]},
            {"url": "https://example.com/side", "kind": "side", "extra_tags": ["Sides"]},
            {"url": "https://example.com/sauce", "kind": "sauce", "extra_tags": ["Sauce"]},
        ]
        self.scrapers = {
            "https://example.com/main": FakeScraper(
                title="Roast Chicken",
                description="Comforting chicken dinner",
                instructions="Season chicken.\nRoast until golden.",
                ingredients=["1 whole chicken", "2 tbsp butter"],
                image_url="https://cdn.example.com/chicken.jpg",
            ),
            "https://example.com/side": FakeScraper(
                title="Green Salad",
                description="Fresh side salad",
                instructions="Wash greens.\nServe cold.",
                ingredients=["1 lettuce", "1 cucumber"],
            ),
            "https://example.com/sauce": FakeScraper(
                title="Herb Sauce",
                description="Bright sauce for grilled dishes",
                instructions="Blend herbs.\nSeason to taste.",
                ingredients=["1 bunch parsley", "2 tbsp olive oil"],
            ),
        }

    @staticmethod
    def fake_parse_ingredient(raw):
        parts = raw.split(" ", 1)
        amount = parts[0]
        name = parts[1] if len(parts) > 1 else raw
        return SimpleNamespace(
            name=[SimpleNamespace(text=name)],
            amount=[SimpleNamespace(text=amount)],
        )

    @patch.object(seed_helpers, "parse_ingredient", side_effect=fake_parse_ingredient.__func__)
    @patch.object(seed_helpers, "scrape_me")
    @patch.object(seed_helpers, "SEED_RECIPES", new_callable=lambda: [])
    def test_populate_database_for_user_creates_recipes_steps_tags_and_suggestions(
        self,
        mock_seed_recipes,
        mock_scrape_me,
        _mock_parse_ingredient,
    ):
        mock_seed_recipes.extend(self.seed_entries)
        mock_scrape_me.side_effect = lambda url: self.scrapers[url]

        created = seed_helpers.populate_database_for_user(username="owner", reset=True)

        self.assertEqual(len(created), 3)
        self.assertEqual(Recipe.objects.count(), 3)
        self.assertEqual(Ingredient.objects.count(), 6)
        self.assertTrue(Tag.objects.filter(name="Dinner").exists())
        self.assertTrue(Tag.objects.filter(name="Sauce").exists())

        main = Recipe.objects.get(title="Roast Chicken")
        side = Recipe.objects.get(title="Green Salad")
        sauce = Recipe.objects.get(title="Herb Sauce")

        self.assertFalse(main.is_side)
        self.assertFalse(main.is_sauce)
        self.assertEqual(main.source_name, "example.com")
        self.assertEqual(main.source_url, "https://example.com/main")
        self.assertEqual(main.image_url, "https://cdn.example.com/chicken.jpg")
        self.assertEqual(main.servings, 4)
        self.assertEqual(main.recipe_ingredients.count(), 2)
        self.assertEqual(RecipeStep.objects.filter(recipe=main).count(), 2)

        self.assertTrue(side.is_side)
        self.assertFalse(side.is_sauce)
        self.assertTrue(sauce.is_sauce)
        self.assertFalse(sauce.is_side)

        self.assertEqual(list(main.suggested_sides.all()), [side])
        self.assertEqual(list(main.suggested_sauces.all()), [sauce])

    def test_populate_database_for_missing_user_raises_command_error(self):
        with self.assertRaises(CommandError):
            seed_helpers.populate_database_for_user(username="missing-user")

    def test_get_or_create_seed_ingredient_reuses_existing_slug_match(self):
        existing = Ingredient.objects.create(name="extra-virgin olive oil")

        resolved = seed_helpers.get_or_create_seed_ingredient("extra virgin olive oil")

        self.assertEqual(resolved.pk, existing.pk)
        self.assertEqual(Ingredient.objects.count(), 1)

    @patch.object(seed_helpers, "parse_ingredient", side_effect=fake_parse_ingredient.__func__)
    @patch.object(seed_helpers, "scrape_me")
    @patch.object(seed_helpers, "SEED_RECIPES", new_callable=lambda: [])
    def test_populate_database_for_user_reuses_ingredient_when_slug_collides(
        self,
        mock_seed_recipes,
        mock_scrape_me,
        _mock_parse_ingredient,
    ):
        Ingredient.objects.create(name="extra-virgin olive oil")
        mock_seed_recipes.extend(
            [{"url": "https://example.com/collision", "kind": "main", "extra_tags": ["Dinner"]}]
        )
        mock_scrape_me.return_value = FakeScraper(
            title="Collision Pasta",
            description="Recipe with normalized ingredient names",
            instructions="Mix.\nCook.",
            ingredients=["1 extra virgin olive oil", "2 garlic cloves"],
        )

        created = seed_helpers.populate_database_for_user(username="owner", reset=False)

        self.assertEqual(len(created), 1)
        self.assertEqual(Recipe.objects.get(title="Collision Pasta").recipe_ingredients.count(), 2)
        self.assertEqual(Ingredient.objects.filter(slug="extra-virgin-olive-oil").count(), 1)

    def test_split_instructions_breaks_multiline_and_sentence_text(self):
        self.assertEqual(
            seed_helpers.split_instructions("First step.\nSecond step."),
            ["First step.", "Second step."],
        )
        self.assertEqual(
            seed_helpers.split_instructions("Mix ingredients. Bake for 20 minutes."),
            ["Mix ingredients.", "Bake for 20 minutes."],
        )
