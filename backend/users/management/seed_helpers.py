"""Seed-data helpers used by management commands to populate demo content."""

import re
from urllib.parse import urlparse

from django.contrib.auth import get_user_model
from django.core.management.base import CommandError
from django.db import connection, transaction
from django.db.models import Q
from django.utils.text import slugify

from ingredient_parser import parse_ingredient
from recipe_scrapers import scrape_me

from recipes.models import Collection, Ingredient, Recipe, RecipeIngredient, RecipeStep, Tag


SEED_RECIPES = [
    {"url": "https://www.bbcgoodfood.com/recipes/cottage-pie", "kind": "main", "extra_tags": ["Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/creamy-mushroom-pasta", "kind": "main", "extra_tags": ["Dinner"]},
    {"url": "https://www.recipetineats.com/one-pot-greek-chicken-lemon-rice/", "kind": "main", "extra_tags": ["Chicken", "Rice", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/creamy-salmon-leek-potato-traybake", "kind": "main", "extra_tags": ["Fish", "Dinner"]},
    {"url": "https://www.twopeasandtheirpod.com/lentil-salad/", "kind": "main", "extra_tags": ["Salad", "Lunch"]},
    {"url": "https://www.bbcgoodfood.com/recipes/honey-chicken", "kind": "main", "extra_tags": ["Chicken", "Dinner"]},
    {"url": "https://www.loveandlemons.com/chickpea-salad/", "kind": "main", "extra_tags": ["Salad", "Lunch"]},
    {"url": "https://www.delish.com/cooking/recipe-ideas/a51338/homemade-chicken-noodle-soup-recipe/", "kind": "main", "extra_tags": ["Chicken", "Soup", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/french-onion-soup", "kind": "main", "extra_tags": ["Soup", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/german-spaetzle", "kind": "side", "extra_tags": ["Sides"]},
    {"url": "https://www.recipetineats.com/schnitzel/", "kind": "main", "extra_tags": ["Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/aubergine-milanese", "kind": "main", "extra_tags": ["Vegetarian", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/mushroom-risotto", "kind": "main", "extra_tags": ["Vegetarian", "Rice", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/chicken-pasta-bake", "kind": "main", "extra_tags": ["Chicken", "Pasta", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/easy-chicken-curry", "kind": "main", "extra_tags": ["Chicken", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/creamy-halloumi-tomato-curry", "kind": "main", "extra_tags": ["Vegetarian", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/pork-noodle-stir-fry", "kind": "main", "extra_tags": ["Pork", "Noodles", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/healthy-chicken-pasta-bake", "kind": "main", "extra_tags": ["Chicken", "Pasta", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/pork-aubergine-noodle-stir-fry", "kind": "main", "extra_tags": ["Pork", "Noodles", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/chicken-alfredo-pasta-bake", "kind": "main", "extra_tags": ["Chicken", "Pasta", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/yogurt-almond-chicken-curry", "kind": "main", "extra_tags": ["Chicken", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/bean-halloumi-stew", "kind": "main", "extra_tags": ["Vegetarian", "Soup", "Dinner"]},
    {"url": "https://www.bbcgoodfood.com/recipes/chicken-leek-pasta-bake-crunchy-top", "kind": "main", "extra_tags": ["Chicken", "Pasta", "Dinner"]},
    {"url": "https://www.recipetineats.com/one-pot-chicken-risoni-with-crispy-salami/", "kind": "main", "extra_tags": ["Chicken", "Pasta", "Dinner"]},
    {"url": "https://www.recipetineats.com/beef-chow-mein-noodles/", "kind": "main", "extra_tags": ["Beef", "Noodles", "Dinner"]},
    {"url": "https://www.recipetineats.com/thai-coconut-pumpkin-soup/", "kind": "main", "extra_tags": ["Soup", "Dinner"]},
    {"url": "https://www.recipetineats.com/cheese-herb-garlic-quick-bread/", "kind": "side", "extra_tags": ["Sides"]},
    {"url": "https://www.recipetineats.com/one-pot-baked-greek-chicken-orzo-risoni/", "kind": "main", "extra_tags": ["Chicken", "Pasta", "Dinner"]},
    {"url": "https://www.recipetineats.com/whipped-ricotta-one-pot-chicken-pasta/", "kind": "main", "extra_tags": ["Chicken", "Pasta", "Dinner"]},
    {"url": "https://www.recipetineats.com/creamy-goat-cheese-roasted-red-pepper-risoni-orzo/", "kind": "main", "extra_tags": ["Vegetarian", "Pasta", "Dinner"]},
    {"url": "https://www.recipetineats.com/thai-chicken-peanut-noodles-mince/", "kind": "main", "extra_tags": ["Chicken", "Noodles", "Dinner"]},
    {"url": "https://www.recipetineats.com/chinese-noodle-soup/", "kind": "main", "extra_tags": ["Noodles", "Soup", "Dinner"]},
    {"url": "https://www.recipetineats.com/dan-dan-noodle-soup-vegetarian/", "kind": "main", "extra_tags": ["Vegetarian", "Noodles", "Soup", "Dinner"]},
    {"url": "https://www.loveandlemons.com/quinoa-salad-recipe/", "kind": "side", "extra_tags": ["Salad", "Sides", "Lunch"]},
    {"url": "https://www.loveandlemons.com/green-salad-recipe/", "kind": "side", "extra_tags": ["Salad", "Sides", "Lunch"]},
    {"url": "https://www.loveandlemons.com/cucumber-tomato-salad/", "kind": "side", "extra_tags": ["Salad", "Sides", "Lunch"]},
    {"url": "https://www.loveandlemons.com/greek-salad/", "kind": "side", "extra_tags": ["Salad", "Sides", "Lunch"]},
    {"url": "https://www.loveandlemons.com/broccoli-pesto-quinoa-salad/", "kind": "side", "extra_tags": ["Salad", "Sides", "Lunch"]},
    {"url": "https://www.twopeasandtheirpod.com/butternut-squash-tortellini-soup/", "kind": "main", "extra_tags": ["Soup", "Pasta", "Dinner"]},
    {"url": "https://www.twopeasandtheirpod.com/lentil-bolognese/", "kind": "main", "extra_tags": ["Vegetarian", "Pasta", "Dinner"]},
    {"url": "https://www.twopeasandtheirpod.com/grilled-vegetable-pasta-salad/", "kind": "side", "extra_tags": ["Pasta", "Salad", "Sides", "Lunch"]},
    {"url": "https://www.twopeasandtheirpod.com/baked-ziti/", "kind": "main", "extra_tags": ["Pasta", "Dinner"]},
    {"url": "https://www.twopeasandtheirpod.com/pasta-primavera/", "kind": "main", "extra_tags": ["Vegetarian", "Pasta", "Dinner"]},
    {"url": "https://www.recipetineats.com/roasted-vegetables/", "kind": "side", "extra_tags": ["Sides", "Vegetarian"]},
    {"url": "https://www.loveandlemons.com/roasted-brussels-sprouts/", "kind": "side", "extra_tags": ["Sides", "Vegetarian"]},
    {"url": "https://www.loveandlemons.com/focaccia/", "kind": "side", "extra_tags": ["Sides"]},
    {"url": "https://www.twopeasandtheirpod.com/garlic-bread/", "kind": "side", "extra_tags": ["Sides"]},
    {"url": "https://www.recipetineats.com/honey-mustard-dressing/", "kind": "sauce", "extra_tags": ["Sauce"]},
    {"url": "https://www.recipetineats.com/pesto/", "kind": "sauce", "extra_tags": ["Sauce"]},
    {"url": "https://www.loveandlemons.com/tzatziki-sauce/", "kind": "sauce", "extra_tags": ["Sauce"]},
    {"url": "https://www.loveandlemons.com/chimichurri/", "kind": "sauce", "extra_tags": ["Sauce"]},
    {"url": "https://www.loveandlemons.com/tahini-sauce/", "kind": "sauce", "extra_tags": ["Sauce"]},
]

SEED_TAGS = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Chicken",
    "Vegetarian",
    "Vegan",
    "Beef",
    "Fish",
    "Pasta",
    "Rice",
    "Salad",
    "Lamb",
    "Sides",
    "Sauce",
    "Soup",
    "Pork",
    "Seafood",
    "Noodles",
]


def infer_tags(title: str, description: str, ingredients: list[str]) -> set[str]:
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
        "haddock", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "squid", "octopus",
        "oyster", "scallop", "gelatin", "lard", "tallow", "duck fat", "goose fat", "fatback", "schmaltz",
    }
    meat_broth_words = {
        "chicken broth", "chicken stock", "beef broth", "beef stock", "pork broth", "pork stock",
        "bone broth", "duck stock", "duck broth", "fish stock", "fish broth",
    }
    veg_broth_words = {"vegetable broth", "veg broth", "vegetable stock"}

    has_meat = has_word(meat_words) or has_word(meat_broth_words)
    if has_word(veg_broth_words):
        has_meat = False

    veg_markers = {"vegetarian", "veggie", "meatless", "plant-based"}
    vegan_markers = {"vegan"}

    if not has_meat or has_word(veg_markers):
        tags.add("Vegetarian")
        dairy_words = {"milk", "cheese", "butter", "cream", "yogurt", "halloumi", "ricotta", "parmesan"}
        if not has_word(dairy_words) and (has_word(vegan_markers) or not has_meat):
            tags.add("Vegan")

    return tags


def parse_servings(scraper):
    try:
        yields_text = scraper.yields() or ""
    except Exception:
        return None

    match = re.search(r"(\d+)", str(yields_text))
    return int(match.group(1)) if match else None


def split_instructions(raw_instructions: str) -> list[str]:
    chunks = [chunk.strip() for chunk in re.split(r"\n+|\r+", raw_instructions) if chunk.strip()]
    if len(chunks) > 1:
        return chunks

    parts = [
        piece.strip()
        for piece in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", raw_instructions.strip())
        if piece.strip()
    ]
    return parts or ([raw_instructions.strip()] if raw_instructions.strip() else [])


def source_name_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def get_or_create_seed_ingredient(name: str) -> Ingredient:
    normalized_name = name.strip()
    normalized_slug = slugify(normalized_name)

    existing = Ingredient.objects.filter(
        Q(name__iexact=normalized_name) | Q(slug=normalized_slug)
    ).order_by("id").first()
    if existing is not None:
        return existing

    return Ingredient.objects.create(name=normalized_name)


def reset_recipe_data():
    if connection.vendor == "postgresql":
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    TRUNCATE
                    recipes_recipestep,
                    recipes_recipeingredient,
                    recipes_collectionrecipe,
                    recipes_rating,
                    recipes_comment,
                    recipes_recipe_suggested_sides,
                    recipes_recipe_suggested_sauces,
                    recipes_recipe_tags,
                    recipes_recipe,
                    recipes_ingredientalias,
                    recipes_ingredient,
                    recipes_tag,
                    recipes_collection
                    RESTART IDENTITY CASCADE;
                    """
                )
        return

    with transaction.atomic():
        Recipe.objects.all().delete()
        Collection.objects.all().delete()
        Ingredient.objects.all().delete()
        Tag.objects.all().delete()


def ensure_seed_tags():
    tag_objs = {}
    for tag_name in SEED_TAGS:
        tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
        tag_objs[tag_name] = tag_obj
    return tag_objs


def populate_database_for_user(username: str, stdout=None, reset=False):
    user_model = get_user_model()
    try:
        owner = user_model.objects.get(username=username)
    except user_model.DoesNotExist as exc:
        raise CommandError(f"User '{username}' does not exist.") from exc

    if reset:
        reset_recipe_data()
        if stdout:
            stdout.write("Existing recipe data cleared.")

    tag_objs = ensure_seed_tags()
    created_recipes = []

    for entry in SEED_RECIPES:
        url = entry["url"]
        try:
            scraper = scrape_me(url)
            title = (scraper.title() or "").strip()
            if not title:
                raise CommandError("Scraper did not return a title.")

            if Recipe.objects.filter(title__iexact=title).exists():
                if stdout:
                    stdout.write(f"Skipping existing recipe: {title}")
                continue

            description = (scraper.description() or "").strip()
            instructions = (scraper.instructions() or "").strip()
            raw_ingredients = scraper.ingredients() or []

            recipe = Recipe.objects.create(
                title=title,
                description=description,
                instructions=instructions,
                created_by=owner,
                servings=parse_servings(scraper),
                image_url=(getattr(scraper, "image", lambda: "")() or "").strip(),
                is_side=entry["kind"] == "side",
                is_sauce=entry["kind"] == "sauce",
                course="side" if entry["kind"] == "side" else "sauce" if entry["kind"] == "sauce" else "main",
                source_name=source_name_from_url(url),
                source_url=url,
            )

            for position, raw in enumerate(raw_ingredients, start=1):
                parsed = parse_ingredient(raw)
                name = parsed.name[0].text.strip() if parsed.name else raw.strip()
                amount_str = parsed.amount[0].text.strip() if parsed.amount else raw.strip()

                ingredient_obj = get_or_create_seed_ingredient(name)
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    ingredient=ingredient_obj,
                    position=position,
                    display_name=name,
                    amount=amount_str,
                )

            for step_position, instruction_text in enumerate(split_instructions(instructions), start=1):
                RecipeStep.objects.create(
                    recipe=recipe,
                    position=step_position,
                    instruction_text=instruction_text,
                )

            inferred_tags = infer_tags(
                title=title,
                description=description,
                ingredients=raw_ingredients,
            )
            inferred_tags.update(entry.get("extra_tags", []))
            if entry["kind"] == "side":
                inferred_tags.add("Sides")
            if entry["kind"] == "sauce":
                inferred_tags.add("Sauce")

            for tag_name in sorted(inferred_tags):
                tag_obj = tag_objs.get(tag_name)
                if tag_obj is None:
                    tag_obj, _ = Tag.objects.get_or_create(name=tag_name)
                    tag_objs[tag_name] = tag_obj
                recipe.tags.add(tag_obj)

            created_recipes.append(recipe)
            if stdout:
                stdout.write(f"Added recipe: {title}")
        except Exception as exc:
            if stdout:
                stdout.write(f"Failed to add {url}: {exc}")

    assign_related_recipes()
    return created_recipes


def assign_related_recipes():
    mains = list(Recipe.objects.filter(is_side=False, is_sauce=False).order_by("id"))
    sides = list(Recipe.objects.filter(is_side=True).order_by("id"))
    sauces = list(Recipe.objects.filter(is_sauce=True).order_by("id"))

    if not mains:
        return

    for index, recipe in enumerate(mains):
        if sides:
            recipe.suggested_sides.set(_rotating_pick(sides, index, 2))
        if sauces:
            recipe.suggested_sauces.set(_rotating_pick(sauces, index, 2))


def _rotating_pick(items, start_index: int, count: int):
    if not items:
        return []

    limit = min(count, len(items))
    return [items[(start_index + offset) % len(items)] for offset in range(limit)]
