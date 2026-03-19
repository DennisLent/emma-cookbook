import random
from collections import defaultdict, deque
from typing import List

from django.db.models import QuerySet

from .models import Recipe


LEGUME_TERMS = ("bean", "lentil", "chickpea", "pea", "legume", "dal")
PESCETARIAN_TERMS = ("fish", "salmon", "tuna", "cod", "shrimp", "prawn", "sardine", "anchovy")
MEAT_TERMS = ("chicken", "beef", "pork", "sausage", "lamb", "turkey", "bacon")


def _recipe_text(recipe: Recipe) -> str:
    tags = " ".join(recipe.tags.values_list("name", flat=True))
    ingredients = " ".join(recipe.recipe_ingredients.values_list("display_name", flat=True))
    return f"{recipe.title} {recipe.description} {tags} {ingredients}".lower()


def is_vegetarian(recipe: Recipe) -> bool:
    text = _recipe_text(recipe)
    if "vegan" in text or "vegetarian" in text:
        return True
    return not any(term in text for term in MEAT_TERMS + PESCETARIAN_TERMS)


def is_pescetarian(recipe: Recipe) -> bool:
    text = _recipe_text(recipe)
    has_seafood = any(term in text for term in PESCETARIAN_TERMS)
    has_meat = any(term in text for term in MEAT_TERMS)
    return has_seafood and not has_meat


def has_legumes(recipe: Recipe) -> bool:
    text = _recipe_text(recipe)
    return any(term in text for term in LEGUME_TERMS)


def get_base_queryset(diet_type: str) -> QuerySet[Recipe]:
    """
    Return recipes filtered by diet tags.

    diet_type:
      - vegan         -> diet:vegan
      - vegetarian    -> diet:vegetarian or diet:vegan
      - pescetarian   -> diet:pescetarian, diet:vegetarian, diet:vegan
      - omnivore      -> no diet filter
    """
    diet = (diet_type or "").lower()
    qs = Recipe.objects.all().prefetch_related("tags")
    if diet == "vegan":
        allowed = ["diet:vegan"]
    elif diet == "vegetarian":
        allowed = ["diet:vegetarian", "diet:vegan"]
    elif diet == "pescetarian":
        allowed = ["diet:pescetarian", "diet:vegetarian", "diet:vegan"]
    else:
        return qs

    return qs.filter(tags__name__in=allowed).distinct()


def apply_frontend_filters(qs: QuerySet[Recipe], dietary_filters: list[str] | None) -> QuerySet[Recipe]:
    filters = {value.lower() for value in (dietary_filters or [])}
    recipes = list(qs)

    def include(recipe: Recipe) -> bool:
        text = _recipe_text(recipe)
        if "vegetarian" in filters and not is_vegetarian(recipe):
            return False
        if "vegan" in filters and "vegan" not in text:
            return False
        if "healthy" in filters and "healthy" not in text:
            return False
        if "seafood-free" in filters and any(term in text for term in PESCETARIAN_TERMS):
            return False
        if "spicy-free" in filters and "spicy" in text:
            return False
        return True

    allowed_ids = [recipe.id for recipe in recipes if include(recipe)]
    return qs.filter(id__in=allowed_ids)


def main_protein(recipe: Recipe) -> str | None:
    """
    Return the first protein tag suffix (protein:<type>) or None if missing.
    """
    if not recipe:
        return None
    for tag in recipe.tags.all():
        if tag.name.startswith("protein:"):
            return tag.name.split(":", 1)[1]
    return None


def generate_meal_plan(diet_type: str, days: int, meals_per_day: int) -> List[List[Recipe]]:
    """
    Generate a days x meals_per_day plan, spreading protein types and avoiding repeats.
    """
    candidates = list(get_base_queryset(diet_type))
    if not candidates or days <= 0 or meals_per_day <= 0:
        return []

    protein_counts = defaultdict(int)
    recipe_counts = defaultdict(int)
    recent = deque(maxlen=min(5, len(candidates)))

    plan: List[List[Recipe]] = []
    for _ in range(days):
        row: List[Recipe] = []
        for _ in range(meals_per_day):
            pool = [r for r in candidates if r not in recent] or candidates

            scored = []
            for r in pool:
                p = main_protein(r)
                scored.append(
                    (
                        protein_counts[p],  # fewer uses preferred
                        recipe_counts[r.id],  # fewer repeats preferred
                        random.random(),  # slight shuffle
                        r,
                    )
                )
            scored.sort(key=lambda x: (x[0], x[1], x[2]))
            top_k = max(1, min(3, len(scored)))
            choice = random.choice(scored[:top_k])[3]

            row.append(choice)
            protein_counts[main_protein(choice)] += 1
            recipe_counts[choice.id] += 1
            recent.append(choice)
        plan.append(row)
    return plan


def generate_balanced_meal_plan(
    *,
    days: int,
    meal_types: list[str],
    dietary_filters: list[str] | None = None,
) -> list[dict]:
    slots_per_day = len(meal_types)
    if days <= 0 or slots_per_day <= 0:
        return []

    base_qs = Recipe.objects.filter(is_side=False, is_sauce=False).prefetch_related("tags", "recipe_ingredients")
    candidates = list(apply_frontend_filters(base_qs, dietary_filters))
    if not candidates:
        return []

    total_slots = days * slots_per_day
    chosen: list[Recipe | None] = [None] * total_slots
    used_ids: set[int] = set()

    # Default balanced baseline when no restrictions are selected:
    # at least one pescetarian dish, one vegetarian dish, and one legume dish if available.
    if not dietary_filters:
        required_groups = [
            ("pescetarian", [recipe for recipe in candidates if is_pescetarian(recipe)]),
            ("vegetarian", [recipe for recipe in candidates if is_vegetarian(recipe)]),
            ("legumes", [recipe for recipe in candidates if has_legumes(recipe)]),
        ]
        slot_index = 0
        for _label, pool in required_groups:
            available = [recipe for recipe in pool if recipe.id not in used_ids]
            if not available:
                continue
            choice = random.choice(available)
            chosen[slot_index] = choice
            used_ids.add(choice.id)
            slot_index += 1
            if slot_index >= total_slots:
                break

    remaining_pool = [recipe for recipe in candidates if recipe.id not in used_ids]
    if not remaining_pool:
        remaining_pool = candidates

    protein_counts = defaultdict(int)
    recipe_counts = defaultdict(int)
    recent = deque(maxlen=min(5, len(candidates)))

    for recipe in chosen:
        if recipe:
            protein_counts[main_protein(recipe)] += 1
            recipe_counts[recipe.id] += 1
            recent.append(recipe)

    for index in range(total_slots):
        if chosen[index] is not None:
            continue
        pool = [recipe for recipe in candidates if recipe not in recent] or candidates
        scored = []
        for recipe in pool:
            scored.append((protein_counts[main_protein(recipe)], recipe_counts[recipe.id], random.random(), recipe))
        scored.sort(key=lambda item: (item[0], item[1], item[2]))
        top_k = max(1, min(3, len(scored)))
        choice = random.choice(scored[:top_k])[3]
        chosen[index] = choice
        protein_counts[main_protein(choice)] += 1
        recipe_counts[choice.id] += 1
        recent.append(choice)

    entries = []
    index = 0
    for day in range(days):
        for meal_type in meal_types:
            recipe = chosen[index]
            entries.append(
                {
                    "day": day,
                    "mealType": meal_type,
                    "recipe": recipe,
                }
            )
            index += 1
    return entries


def swap_recipe(
    diet_type: str,
    current_recipe_id: int,
    existing_plan_ids: List[int],
    dietary_filters: list[str] | None = None,
) -> Recipe | None:
    """
    Swap a recipe, preferring same protein, while avoiding recipes already in the plan.
    """
    base = get_base_queryset(diet_type)
    current = Recipe.objects.filter(pk=current_recipe_id).first()
    target_protein = main_protein(current) if current else None

    pool = apply_frontend_filters(base, dietary_filters).exclude(id__in=existing_plan_ids or [])
    if target_protein:
        same_protein = pool.filter(tags__name=f"protein:{target_protein}").distinct()
        if same_protein.exists():
            pool = same_protein

    candidates = list(pool)
    if not candidates:
        return None
    return random.choice(candidates)
