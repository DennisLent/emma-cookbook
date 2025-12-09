import random
from collections import defaultdict, deque
from typing import List

from django.db.models import QuerySet

from .models import Recipe


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


def main_protein(recipe: Recipe) -> str:
    """
    Return the first protein tag suffix (protein:<type>) or 'unknown'.
    """
    if not recipe:
        return "unknown"
    for tag in recipe.tags.all():
        if tag.name.startswith("protein:"):
            return tag.name.split(":", 1)[1]
    return "unknown"


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


def swap_recipe(diet_type: str, current_recipe_id: int, existing_plan_ids: List[int]) -> Recipe | None:
    """
    Swap a recipe, preferring same protein, while avoiding recipes already in the plan.
    """
    base = get_base_queryset(diet_type)
    current = Recipe.objects.filter(pk=current_recipe_id).first()
    target_protein = main_protein(current) if current else None

    pool = base.exclude(id__in=existing_plan_ids or [])
    if target_protein:
        same_protein = pool.filter(tags__name=f"protein:{target_protein}").distinct()
        if same_protein.exists():
            pool = same_protein

    candidates = list(pool)
    if not candidates:
        return None
    return random.choice(candidates)
