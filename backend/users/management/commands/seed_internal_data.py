# recipes/management/commands/seed_internal_data.py
import os
from django.core.management.base import BaseCommand
from django.db import transaction, connection
from django.contrib.auth import get_user_model
from recipe_scrapers import scrape_me
from ingredient_parser import parse_ingredient
from recipes.models import Recipe, Ingredient, RecipeIngredient, Tag
import re

RECIPE_URLS = [
    # Core set
    "https://www.bbcgoodfood.com/recipes/cottage-pie",
    "https://www.bbcgoodfood.com/recipes/creamy-mushroom-pasta",
    "https://www.recipetineats.com/one-pot-greek-chicken-lemon-rice/",
    "https://www.bbcgoodfood.com/recipes/creamy-salmon-leek-potato-traybake",
    "https://www.twopeasandtheirpod.com/lentil-salad/",
    "https://www.bbcgoodfood.com/recipes/honey-chicken",
    "https://www.loveandlemons.com/chickpea-salad/",
    "https://www.delish.com/cooking/recipe-ideas/a51338/homemade-chicken-noodle-soup-recipe/",
    "https://www.bbcgoodfood.com/recipes/french-onion-soup",
    "https://www.bbcgoodfood.com/recipes/german-spaetzle",
    "https://www.recipetineats.com/schnitzel/",
    "https://www.bbcgoodfood.com/recipes/aubergine-milanese",
    "https://www.bbcgoodfood.com/recipes/mushroom-risotto",
    # Additional variety
    "https://www.bbcgoodfood.com/recipes/chicken-pasta-bake",
    "https://www.bbcgoodfood.com/recipes/easy-chicken-curry",
    "https://www.bbcgoodfood.com/recipes/creamy-halloumi-tomato-curry",
    "https://www.bbcgoodfood.com/recipes/pork-noodle-stir-fry",
    "https://www.bbcgoodfood.com/recipes/healthy-chicken-pasta-bake",
    "https://www.bbcgoodfood.com/recipes/pork-aubergine-noodle-stir-fry",
    "https://www.bbcgoodfood.com/recipes/chicken-alfredo-pasta-bake",
    "https://www.bbcgoodfood.com/recipes/yogurt-almond-chicken-curry",
    "https://www.bbcgoodfood.com/recipes/bean-halloumi-stew",
    "https://www.bbcgoodfood.com/recipes/chicken-leek-pasta-bake-crunchy-top",
    "https://www.recipetineats.com/one-pot-chicken-risoni-with-crispy-salami/",
    "https://www.recipetineats.com/beef-chow-mein-noodles/",
    "https://www.recipetineats.com/thai-coconut-pumpkin-soup/",
    "https://www.recipetineats.com/cheese-herb-garlic-quick-bread/",
    "https://www.recipetineats.com/one-pot-baked-greek-chicken-orzo-risoni/",
    "https://www.recipetineats.com/whipped-ricotta-one-pot-chicken-pasta/",
    "https://www.recipetineats.com/creamy-goat-cheese-roasted-red-pepper-risoni-orzo/",
    "https://www.recipetineats.com/thai-chicken-peanut-noodles-mince/",
    "https://www.recipetineats.com/chinese-noodle-soup/",
    "https://www.recipetineats.com/dan-dan-noodle-soup-vegetarian/",
    "https://www.loveandlemons.com/quinoa-salad-recipe/",
    "https://www.loveandlemons.com/green-salad-recipe/",
    "https://www.loveandlemons.com/cucumber-tomato-salad/",
    "https://www.loveandlemons.com/greek-salad/",
    "https://www.loveandlemons.com/broccoli-pesto-quinoa-salad/",
    "https://www.twopeasandtheirpod.com/butternut-squash-tortellini-soup/",
    "https://www.twopeasandtheirpod.com/lentil-bolognese/",
    "https://www.twopeasandtheirpod.com/grilled-vegetable-pasta-salad/",
    "https://www.twopeasandtheirpod.com/baked-ziti/",
    "https://www.twopeasandtheirpod.com/pasta-primavera/",
]

SEED_TAGS = [
    "Chicken",
    "Vegetarian",
    "Vegan",
    "Beef",
    "Fish",
    "Pasta",
    "Rice",
    "Salad",
    "Lamb",
    "Dinner",
    "Breakfast",
    "Lunch",
    "Sides",
    "Soup",
    "Pork",
    "Seafood",
    "Noodles",
]

class Command(BaseCommand):
    help = "Seeds the database with a default user and some example recipes"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default=os.getenv("DJANGO_SUPERUSER_USERNAME", "admin"),
            help="Username for the created superuser",
        )
        parser.add_argument(
            "--password",
            default=os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin123"),
            help="Password for the created superuser",
        )

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]

        # remove all previous recipes
        with transaction.atomic():
            with connection.cursor() as c:
                c.execute("""
                    TRUNCATE
                    recipes_recipeingredient,
                    recipes_rating,
                    recipes_comment,
                    recipes_recipe,
                    recipes_ingredient,
                    recipes_tag
                    RESTART IDENTITY CASCADE;
                """)
        User = get_user_model()

        # 1. Create or get superuser
        admin_user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": username.capitalize(),
                "last_name": "Admin",
                "bio": "Default admin :P",
                "is_superuser": True,
                "is_staff": True
            }
        )
        if created:
            admin_user.set_password(password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(
                f"Created superuser '{username}'"
            ))
        else:
            self.stdout.write(f"Superuser '{username}' already exists")

        tag_objs = {}
        for tag_name in SEED_TAGS:
            tag_obj, _ = Tag.objects.get_or_create(name__iexact=tag_name, defaults={"name": tag_name})
            tag_objs[tag_name] = tag_obj
        self.stdout.write(self.style.SUCCESS(f"Seeded tags: {', '.join(SEED_TAGS)}"))

        for url in RECIPE_URLS:
            try:
                scraper = scrape_me(url)
                title = scraper.title().strip()

                # Skip if we've already got that title
                if Recipe.objects.filter(title__iexact=title).exists():
                    self.stdout.write(f"Skipping existing recipe: {title}")
                    continue

                description = (scraper.description() or "").strip()
                instructions = scraper.instructions().strip()
                raw_ingredients = scraper.ingredients()

                # Create recipe shell
                recipe = Recipe.objects.create(
                    title=title,
                    description=description,
                    instructions=instructions,
                    created_by=admin_user,
                )

                # Parse and create ingredients
                for raw in raw_ingredients:
                    parsed = parse_ingredient(raw)

                    # extract name
                    if parsed.name:
                        name = parsed.name[0].text.strip()
                    else:
                        # fallback to full raw if parsing fails
                        name = raw.strip()

                    # extract amount and unit
                    if parsed.amount:
                        amount_str = parsed.amount[0].text.strip()
                    else:
                        amount_str = raw.strip()

                    ingredient_obj, _ = Ingredient.objects.get_or_create(
                        name__iexact=name,
                        defaults={'name': name}
                    )
                    RecipeIngredient.objects.create(
                        recipe=recipe,
                        ingredient=ingredient_obj,
                        amount=amount_str
                    )

                # Auto-tag based on title/description/ingredients
                inferred = self.infer_tags(
                    title=title,
                    description=description,
                    ingredients=raw_ingredients
                )
                for tag_name in inferred:
                    obj = tag_objs.get(tag_name)
                    if obj:
                        recipe.tags.add(obj)
                    else:
                        obj, _ = Tag.objects.get_or_create(name=tag_name)
                        tag_objs[tag_name] = obj
                        recipe.tags.add(obj)
                
                recipe.save()

                self.stdout.write(self.style.SUCCESS(f"Added recipe: {title}"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to add {url}: {e}"))

    def infer_tags(self, title: str, description: str, ingredients: list[str]) -> set[str]:
        """
        Keyword-based tag inference with stricter word matching to avoid false positives
        (e.g., chicken vs chickpea).
        """
        text = f"{title} {description} {' '.join(ingredients)}".lower()
        tags = set()

        def has_word(term_list):
            for term in term_list:
                term = term.lower()
                if " " in term:
                    if term in text:
                        return True
                else:
                    if re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text):
                        return True
            return False

        keyword_map = {
            "Chicken": ["chicken", "turkey"],
            "Beef": ["beef"],
            "Pork": ["pork", "bacon", "ham", "sausage", "prosciutto", "salami"],
            "Lamb": ["lamb", "mutton"],
            "Fish": ["fish", "salmon", "cod", "trout", "tuna", "anchovy", "sardine", "haddock"],
            "Seafood": ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "squid", "octopus", "oyster", "scallop"],
            "Pasta": ["pasta", "spaghetti", "penne", "linguine", "tortellini", "ziti", "orzo", "rigatoni", "fusilli", "macaroni"],
            "Noodles": ["noodle", "ramen", "udon", "soba", "chow mein", "lo mein"],
            "Rice": ["rice", "risotto"],
            "Soup": ["soup", "broth", "stew"],
            "Salad": ["salad"],
        }

        for tag_name, keywords in keyword_map.items():
            if has_word(keywords):
                tags.add(tag_name)

        meat_words = {
            "chicken", "turkey", "beef", "pork", "bacon", "ham", "sausage", "prosciutto", "salami",
            "lamb", "mutton", "fish", "salmon", "cod", "trout", "tuna", "anchovy", "sardine",
            "haddock", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "squid", "octopus", "oyster", "scallop",
            "gelatin", "lard", "tallow", "duck fat", "goose fat", "fatback", "schmaltz"
        }
        meat_broth_words = {
            "chicken broth", "chicken stock", "beef broth", "beef stock", "pork broth", "pork stock",
            "bone broth", "duck stock", "duck broth", "fish stock", "fish broth"
        }
        veg_broth_words = {"vegetable broth", "veg broth", "vegetable stock"}

        has_meat = has_word(meat_words) or has_word(meat_broth_words)
        if has_word(veg_broth_words):
            # Explicit vegetable broth shouldn't count as meat
            has_meat = False

        veg_markers = {"vegetarian", "veggie", "meatless", "plant-based"}
        vegan_markers = {"vegan"}

        if not has_meat or has_word(veg_markers):
            tags.add("Vegetarian")
            dairy_words = {"milk", "cheese", "butter", "cream", "yogurt", "halloumi", "ricotta", "parmesan"}
            if not has_word(dairy_words) and (has_word(vegan_markers) or not has_meat):
                tags.add("Vegan")

        return tags
