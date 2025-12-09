from rest_framework import viewsets, permissions, status
from .models import Recipe, Tag, Rating, Comment, Ingredient
from .serializers import RecipeSerializer, TagSerializer, RatingSerializer, CommentSerializer, IngredientSerializer
from users.models import User
import random
from django.db.models import Avg, Count, Value, FloatField
from django.db.models.functions import Coalesce
from django.db import transaction
from rest_framework.decorators import action
from rest_framework.response import Response
from .meal_plan import generate_meal_plan, swap_recipe

from .extraction.services import (
    extract_recipe_from_website,
    extract_recipe_from_youtube,
    extract_recipe_from_instagram,
)
from .extraction.utils.instagram import InstagramCheckpointRequired

import traceback
from django.http import QueryDict

# Custom permission
class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow an object's authors to edit or delete it.
    Model instance needs a .user attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only to the owning user
        owner = getattr(obj, 'user', None)
        return owner == request.user

class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().order_by('-created_at')
    serializer_class = RecipeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    class IsOwnerOrReadOnly(permissions.BasePermission):
        """
        Only allow the recipe creator to edit/delete. Read-only for others.
        """
        def has_object_permission(self, request, view, obj):
            if request.method in permissions.SAFE_METHODS:
                return True
            return getattr(obj, 'created_by', None) == request.user

    def get_permissions(self):
        # Apply owner check for mutating actions
        if self.action in ('update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), self.IsOwnerOrReadOnly()]
        return [perm() if isinstance(perm, type) else perm for perm in self.permission_classes]

    def _normalize_payload(self, request):
        """
        Normalize incoming payload for create/update:
        - Accept ingredient names, create/look up Ingredient rows, and build serializer-friendly
          recipeingredient_set payload.
        """
        data = request.data.copy() if isinstance(request.data, QueryDict) else dict(request.data)

        tags = data.getlist('tags') if isinstance(data, QueryDict) else data.get('tags', [])
        if not tags and isinstance(request.data, QueryDict):
            # handle FormData keys like tags[0]
            tags = []
            for key in request.data.keys():
                if key.startswith('tags['):
                    tags.extend(request.data.getlist(key))
        ingredients = []
        if isinstance(data.get("ingredients_data"), list):
          ingredients = data.pop("ingredients_data")
        else:
            i = 0
            while True:
                nkey = f"ingredients_data[{i}][ingredient]"
                akey = f"ingredients_data[{i}][amount]"
                if nkey not in data:
                    break
                ingredients.append({
                    "ingredient": data.pop(nkey),
                    "amount": data.pop(akey)
                })
                i += 1

        nested = []
        for ing in ingredients:
            raw_name = ing.get("ingredient") if isinstance(ing, dict) else None
            raw_amount = ing.get("amount") if isinstance(ing, dict) else ''
            name = ''
            if isinstance(raw_name, (list, tuple)):
                name = str(raw_name[0]).strip()
            elif isinstance(raw_name, str):
                name = raw_name.strip()
            amount = ''
            if isinstance(raw_amount, (list, tuple)):
                amount = str(raw_amount[0]).strip()
            else:
                amount = str(raw_amount or '').strip()
            if not name:
                continue
            ing_obj, _ = Ingredient.objects.get_or_create(name__iexact=name, defaults={"name": name})
            nested.append({
                "ingredient_id": ing_obj.pk,
                "amount": amount or name,
            })

        if isinstance(data, QueryDict):
            data = data.dict()
        data["ingredients_data"] = nested
        data["tags"] = tags

        return data

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()

        sort = request.query_params.get('sort')
        direction = request.query_params.get('direction', 'desc')
        dir_prefix = '-' if direction == 'desc' else ''

        # Only allow sorting for authenticated users
        if request.user and request.user.is_authenticated and sort in ('rating', 'favorites'):
            if sort == 'rating':
                qs = Recipe.objects.annotate(
                    avg_rating_order=Coalesce(Avg('ratings__stars'), Value(0.0), output_field=FloatField())
                ).order_by(f"{dir_prefix}avg_rating_order", '-created_at')
            elif sort == 'favorites':
                qs = Recipe.objects.annotate(fav_count=Count('favorites', distinct=True)).order_by(f"{dir_prefix}fav_count", '-created_at')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):

        print(">>> RAW request.data:", request.data)

        if isinstance(request.data, QueryDict):
            data = request.data.copy()
        else:
            data = dict(request.data)
        print(">>> After copy/normalize:", data)

        for opt in (
            "servings", "prep_time", "cook_time", "total_time",
            "origin", "source_name", "source_url", "author_name",
            "cuisine", "course", "difficulty", "calories",
            "nutrition", "equipment", "notes", "video_url",
        ):
            if not data.get(opt):
                data.pop(opt, None)
        print(">>> After dropping blank optionals:", data)

        ingredients = []
        if isinstance(data.get("ingredients_data"), list):
            # JSON payload case
            ingredients = data.pop("ingredients_data")
        else:
            # form-data case
            i = 0
            while True:
                nkey = f"ingredients_data[{i}][ingredient]"
                akey = f"ingredients_data[{i}][amount]"
                if nkey not in data:
                    break

                raw_name   = data.pop(nkey)
                raw_amount = data.pop(akey)

                name   = raw_name[0]   if isinstance(raw_name, (list, tuple))   else raw_name
                amount = raw_amount[0] if isinstance(raw_amount, (list, tuple)) else raw_amount

                ingredients.append({
                    "ingredient": name,
                    "amount":     amount,
                })
                i += 1
            print(">>> Parsed form-data ingredients_data:", ingredients)


        nested = []
        for ing in ingredients:
            name, amount = ing["ingredient"], ing["amount"]
            obj, _ = Ingredient.objects.get_or_create(
                name__iexact=name, defaults={"name": name}
            )
            nested.append({
                "ingredient_id": obj.pk,
                "amount":        amount,
            })
        print(">>> Built nested recipeingredient_set:", nested)

        if isinstance(data, QueryDict):
            data.setlist("ingredients_data", nested)
        else:
            data["ingredients_data"] = nested
        print(">>> Final payload for serializer:", data)

        serializer = self.get_serializer(data=data, context={"request": request})
        if not serializer.is_valid():
            print(">>> Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


        with transaction.atomic():
            instance = serializer.save(created_by=request.user)

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(instance).data,
                        status=status.HTTP_201_CREATED,
                        headers=headers)

    def update(self, request, *args, **kwargs):
        recipe = self.get_object()
        data = self._normalize_payload(request)
        serializer = self.get_serializer(recipe, data=data, partial=False, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='plan', permission_classes=[permissions.AllowAny])
    def plan(self, request):
        """Generate a simple meal plan based on diet and size."""
        diet = (request.data.get('diet_type') or 'omnivore').lower()
        try:
            days = max(1, min(14, int(request.data.get('days', 7))))
            meals_per_day = max(1, min(5, int(request.data.get('meals_per_day', 3))))
        except Exception:
            return Response({"detail": "Invalid days or meals_per_day"}, status=status.HTTP_400_BAD_REQUEST)

        plan = generate_meal_plan(diet, days, meals_per_day)
        serializer = RecipeSerializer
        data = [[serializer(r, context={"request": request}).data for r in row] for row in plan]
        return Response({"plan": data})

    @action(detail=False, methods=['post'], url_path='swap', permission_classes=[permissions.AllowAny])
    def swap(self, request):
        """Swap a recipe in an existing plan, prefer same protein."""
        diet = (request.data.get('diet_type') or 'omnivore').lower()
        try:
            current_id = int(request.data.get('current_recipe_id'))
        except Exception:
            return Response({"detail": "current_recipe_id required"}, status=status.HTTP_400_BAD_REQUEST)
        existing_ids = request.data.get('existing_plan_ids') or []
        if not isinstance(existing_ids, (list, tuple)):
            existing_ids = []
        existing_ids = [int(i) for i in existing_ids if str(i).isdigit()]

        replacement = swap_recipe(diet, current_id, existing_ids)
        if not replacement:
            return Response({"detail": "No replacement found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(RecipeSerializer(replacement, context={"request": request}).data)


    @action(detail=False, methods=['get'], url_path='suggestions')
    def suggestions(self, request):
        """
        Return a varied list of 7 recipes, ordered roughly by highest average rating
        with some randomness so results differ each time.
        """
        # get average rating
        top_qs = Recipe.objects.annotate(avg_rating=Avg('ratings__stars'))

        # sort by descending avg_rating
        # take top 20 for randomness pool
        top_recipes = list(top_qs.order_by('-avg_rating')[:20])

        # pick up to 7 unique recipes at random
        count = min(7, len(top_recipes))
        suggestions = random.sample(top_recipes, count)

        # serialize and return
        serializer = self.get_serializer(suggestions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path="preview/website", permission_classes=[permissions.IsAuthenticated])
    def get_from_website(self, request):
        url = request.data.get('url')
        if not url:
            return Response({"detail": "Missing `url`"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = extract_recipe_from_website(url=url)
        except Exception as e:
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        return Response(data)
    
    @action(detail=False, methods=['post'], url_path="preview/youtube", permission_classes=[permissions.IsAuthenticated])
    def get_from_youtube(self, request):
        video_url = request.data.get('video_url')
        if not video_url:
            return Response({"detail": "Missing `video_url`"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = extract_recipe_from_youtube(video_url, model="llama3.2")
        except Exception as e:
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        if data is None:
            return Response({"detail": "No recipe found in that video."},status=status.HTTP_204_NO_CONTENT)

        return Response(data)

    @action(detail=False, methods=['post'], url_path="preview/instagram", permission_classes=[permissions.IsAuthenticated])
    def get_from_instagram(self, request):
        """Preview a recipe from an Instagram Reel."""

        video_url   = request.data.get('video_url')
        ig_username = request.data.get('ig_username')
        ig_password = request.data.get('ig_password')

        if not video_url:
            return Response({"detail": "Missing `video_url`"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = extract_recipe_from_instagram(
                video_url,
                model="llama3.2",
                ig_username=ig_username,
                ig_password=ig_password,
            )
        except InstagramCheckpointRequired as e:
            return Response({"detail": str(e), "challenge_url": e.challenge_url}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            traceback.print_exc()
            return Response({"detail": str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        if data is None:
            return Response({"detail": "No recipe found in that video."}, status=status.HTTP_204_NO_CONTENT)

        return Response(data)

    @action(detail=True, methods=['post', 'delete', 'get'], url_path='favorite', permission_classes=[permissions.IsAuthenticated])
    def favorite(self, request, pk=None):
        """Favorite/unfavorite a recipe for the current user, or fetch status."""
        recipe = self.get_object()
        user = request.user

        if request.method == 'GET':
            is_favorited = recipe.favorites.filter(user=user).exists()
            return Response({
                'is_favorited': is_favorited,
                'favorites_count': recipe.favorites.count(),
            })

        if request.method == 'POST':
            recipe.favorites.get_or_create(user=user)
            return Response({
                'is_favorited': True,
                'favorites_count': recipe.favorites.count(),
            }, status=status.HTTP_200_OK)

        # DELETE
        recipe.favorites.filter(user=user).delete()
        return Response({
            'is_favorited': False,
            'favorites_count': recipe.favorites.count(),
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='rate', permission_classes=[permissions.IsAuthenticated])
    def rate(self, request, pk=None):
        """Create or update the current user's rating for this recipe."""
        recipe = self.get_object()
        user = request.user
        try:
            stars = int(request.data.get('stars'))
        except Exception:
            return Response({"detail": "Missing or invalid 'stars' (1-5)"}, status=status.HTTP_400_BAD_REQUEST)
        if not (1 <= stars <= 5):
            return Response({"detail": "'stars' must be between 1 and 5"}, status=status.HTTP_400_BAD_REQUEST)

        rating, _created = Rating.objects.get_or_create(recipe=recipe, user=user, defaults={'stars': stars})
        if not _created:
            rating.stars = stars
            rating.save()

        avg = Recipe.objects.filter(pk=recipe.pk).aggregate(avg=Avg('ratings__stars')).get('avg')
        return Response({
            'my_rating': rating.stars,
            'avg_rating': avg,
        }, status=status.HTTP_200_OK)

class IngredientViewSet(viewsets.ModelViewSet):
    """
    Anyone can list/retrieve tags.
    Only authenticated users can create, edit or delete tags.
    """
    queryset = Ingredient.objects.all().order_by('name')
    serializer_class = IngredientSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
class TagViewSet(viewsets.ModelViewSet):
    """
    Anyone can list/retrieve tags.
    Only authenticated users can create, edit or delete tags.
    """
    queryset = Tag.objects.all().order_by('name')
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class RatingViewSet(viewsets.ModelViewSet):
    """
    Anyone can list/retrieve ratings.
    Only authenticated users can create.
    Only the rating’s owner can edit or delete their rating.
    """
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CommentViewSet(viewsets.ModelViewSet):
    """
    Anyone can list/retrieve comments.
    Only authenticated users can create.
    Only the comment’s author can edit or delete their comment.
    """
    queryset = Comment.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
