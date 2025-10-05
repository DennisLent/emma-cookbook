from django.db import models
from users.models import User

class Tag(models.Model):
    name = models.CharField(max_length=30, unique=True)

    def __str__(self):
        return self.name

class Ingredient(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Recipe(models.Model):
    # Title of recipe
    title = models.CharField(max_length=255)
    # Description of recipe
    description = models.TextField(blank=True)
    # Ingredients
    ingredients = models.ManyToManyField(Ingredient, through="RecipeIngredient")
    # Instructions
    instructions = models.TextField()
    # Created by and created at
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipes')
    created_at = models.DateTimeField(auto_now_add=True)
    # Tags for recipes
    tags = models.ManyToManyField(Tag, related_name='recipes', blank=True)
    # Servings
    servings = models.PositiveIntegerField(blank=True, null=True)
    # Cooking times
    prep_time = models.DurationField(blank=True, null=True)
    cook_time = models.DurationField(blank=True, null=True)
    total_time = models.DurationField(blank=True, null=True)
    # Optional image
    image = models.ImageField(upload_to='recipe_images/', blank=True, null=True)

    # Optional metadata
    origin = models.CharField(max_length=255, blank=True)
    source_name = models.CharField(max_length=255, blank=True)
    source_url = models.URLField(blank=True)
    author_name = models.CharField(max_length=255, blank=True)
    cuisine = models.CharField(max_length=100, blank=True)
    course = models.CharField(max_length=100, blank=True)

    DIFFICULTY_CHOICES = (
        ("easy", "easy"),
        ("medium", "medium"),
        ("hard", "hard"),
    )
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, blank=True)

    calories = models.PositiveIntegerField(blank=True, null=True)
    nutrition = models.JSONField(default=dict, blank=True)
    equipment = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    video_url = models.URLField(blank=True)

    def __str__(self):
        return self.title

class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    amount = models.CharField(max_length=150)

    def __str__(self):
        return f"{self.amount} {self.ingredient}"

# One rating per user per recipe
class Rating(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    stars = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ('recipe', 'user')

    def __str__(self):
        return f"{self.stars}⭐ by {self.user.username} for {self.recipe.title}"

class Comment(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on {self.recipe.title}"


class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='favorites')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "recipe")

    def __str__(self):
        return f"{self.user.username}  {self.recipe.title}"
