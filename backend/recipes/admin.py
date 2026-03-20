from django.contrib import admin

from .models import (
    Collection,
    CollectionRecipe,
    Comment,
    Ingredient,
    IngredientAlias,
    Rating,
    Recipe,
    RecipeIngredient,
    RecipeStep,
    Tag,
)


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 0
    autocomplete_fields = ("ingredient",)
    fields = ("position", "ingredient", "display_name", "amount", "quantity_text", "unit_text", "note")
    ordering = ("position", "id")


class RecipeStepInline(admin.TabularInline):
    model = RecipeStep
    extra = 0
    fields = ("position", "instruction_text", "timer_seconds", "image_url")
    ordering = ("position", "id")


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "created_by",
        "course",
        "cuisine",
        "is_side",
        "is_sauce",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_side", "is_sauce", "course", "cuisine", "difficulty", "tags", "created_by")
    search_fields = (
        "title",
        "description",
        "instructions",
        "notes",
        "source_name",
        "source_url",
        "author_name",
        "ingredients__name",
        "tags__name",
    )
    autocomplete_fields = ("created_by",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [RecipeIngredientInline, RecipeStepInline]
    filter_horizontal = ("tags", "suggested_sides", "suggested_sauces")
    fieldsets = (
        ("Core", {
            "fields": ("title", "description", "instructions", "created_by", "tags")
        }),
        ("Recipe Type", {
            "fields": ("course", "cuisine", "difficulty", "is_side", "is_sauce")
        }),
        ("Timing & Yield", {
            "fields": ("servings", "prep_minutes", "cook_minutes", "prep_time", "cook_time", "total_time")
        }),
        ("Media & Notes", {
            "fields": ("image", "image_url", "video_url", "equipment", "notes")
        }),
        ("Source", {
            "fields": ("origin", "source_name", "source_url", "author_name")
        }),
        ("Nutrition", {
            "fields": ("calories", "nutrition")
        }),
        ("Suggestions", {
            "fields": ("suggested_sides", "suggested_sauces")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at")
        }),
    )


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent")
    search_fields = ("name", "slug", "aliases__alias_name")
    autocomplete_fields = ("parent",)


@admin.register(IngredientAlias)
class IngredientAliasAdmin(admin.ModelAdmin):
    list_display = ("alias_name", "ingredient", "normalized_alias")
    search_fields = ("alias_name", "ingredient__name", "normalized_alias")
    autocomplete_fields = ("ingredient",)


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ("recipe", "position", "ingredient", "display_name", "amount")
    list_filter = ("recipe",)
    search_fields = ("recipe__title", "ingredient__name", "display_name", "amount", "note")
    autocomplete_fields = ("recipe", "ingredient")


@admin.register(RecipeStep)
class RecipeStepAdmin(admin.ModelAdmin):
    list_display = ("recipe", "position", "timer_seconds")
    list_filter = ("recipe",)
    search_fields = ("recipe__title", "instruction_text")
    autocomplete_fields = ("recipe", "ingredients")


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("recipe", "user", "stars", "created_at", "updated_at")
    list_filter = ("stars", "created_at")
    search_fields = ("recipe__title", "user__username")
    autocomplete_fields = ("recipe", "user")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("recipe", "user", "created_at", "updated_at")
    search_fields = ("recipe__title", "user__username", "text")
    list_filter = ("created_at", "updated_at")
    autocomplete_fields = ("recipe", "user")


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at", "updated_at")
    search_fields = ("name", "owner__username", "owner__display_name")
    autocomplete_fields = ("owner",)


@admin.register(CollectionRecipe)
class CollectionRecipeAdmin(admin.ModelAdmin):
    list_display = ("collection", "recipe")
    search_fields = ("collection__name", "recipe__title")
    autocomplete_fields = ("collection", "recipe")
