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
    extra = 1

class RecipeStepInline(admin.TabularInline):
    model = RecipeStep
    extra = 1

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'created_at', 'updated_at', 'is_side', 'is_sauce')
    search_fields = ('title', 'description', 'instructions', 'ingredients__name')
    list_filter = ('tags', 'is_side', 'is_sauce')
    inlines = [RecipeIngredientInline, RecipeStepInline]
    filter_horizontal = ('tags', 'suggested_sides', 'suggested_sauces')

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)

@admin.register(IngredientAlias)
class IngredientAliasAdmin(admin.ModelAdmin):
    list_display = ('alias_name', 'ingredient', 'normalized_alias')
    search_fields = ('alias_name', 'ingredient__name', 'normalized_alias')

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'user', 'stars')
    list_filter = ('stars',)

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'user', 'created_at')
    search_fields = ('text',)
    list_filter = ('created_at',)

@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at', 'updated_at')
    search_fields = ('name', 'owner__username')

@admin.register(CollectionRecipe)
class CollectionRecipeAdmin(admin.ModelAdmin):
    list_display = ('collection', 'recipe')
    search_fields = ('collection__name', 'recipe__title')
