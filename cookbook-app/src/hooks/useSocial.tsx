// Social context for favorites, ratings, and comments layered on top of recipe data.

import { createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import { Comment, Rating, RecipeSocialData } from "@/types/social";
import { useAuth } from "@/hooks/useAuth";
import { useRecipes } from "@/hooks/useRecipes";
import { apiRequest } from "@/lib/api";

type SocialContextType = {
  favorites: Set<string>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  isFavorite: (recipeId: string) => boolean;
  ratings: Rating[];
  rateRecipe: (recipeId: string, value: number) => Promise<void>;
  getAverageRating: (recipeId: string) => { average: number; count: number };
  getUserRating: (recipeId: string) => number | undefined;
  comments: Comment[];
  addComment: (recipeId: string, text: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  getRecipeComments: (recipeId: string) => Comment[];
  getRecipeSocialData: (recipeId: string) => RecipeSocialData;
};

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { recipes, refreshRecipe, refreshRecipes } = useRecipes();

  const favorites = useMemo(
    () => new Set((user?.favoriteRecipeIds || []).map((id) => String(id))),
    [user?.favoriteRecipeIds],
  );

  const ratings = useMemo(() => {
    return recipes.flatMap((recipe) =>
      (recipe.ratings || []).map((rating) => ({
        ...rating,
        recipeId: String(rating.recipeId || recipe.id),
      })),
    );
  }, [recipes]);

  const comments = useMemo(() => {
    return recipes.flatMap((recipe) =>
      (recipe.comments || []).map((comment) => ({
        ...comment,
        recipeId: String(comment.recipeId || recipe.id),
      })),
    );
  }, [recipes]);

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      if (!isAuthenticated || !user) {
        throw new Error("You must be logged in to manage favorites.");
      }
      const isFav = favorites.has(recipeId);
      await apiRequest(`/recipes/${recipeId}/favorite/`, {
        method: isFav ? "DELETE" : "POST",
      });
      await Promise.all([refreshRecipe(recipeId), refreshRecipes()]);
    },
    [favorites, isAuthenticated, refreshRecipe, refreshRecipes, user],
  );

  const isFavorite = useCallback((recipeId: string) => favorites.has(recipeId), [favorites]);

  const rateRecipe = useCallback(
    async (recipeId: string, value: number) => {
      if (!isAuthenticated || !user) {
        throw new Error("You must be logged in to rate recipes.");
      }
      await apiRequest(`/recipes/${recipeId}/rate/`, {
        method: "POST",
        body: JSON.stringify({ stars: value }),
      });
      await refreshRecipe(recipeId);
    },
    [isAuthenticated, refreshRecipe, user],
  );

  const getAverageRating = useCallback(
    (recipeId: string) => {
      const recipe = recipes.find((entry) => entry.id === recipeId);
      const ratingsList = recipe?.ratings || [];
      if (ratingsList.length === 0) return { average: 0, count: 0 };
      const sum = ratingsList.reduce((acc, rating) => acc + rating.value, 0);
      return { average: sum / ratingsList.length, count: ratingsList.length };
    },
    [recipes],
  );

  const getUserRating = useCallback(
    (recipeId: string) => recipes.find((entry) => entry.id === recipeId)?.my_rating,
    [recipes],
  );

  const addComment = useCallback(
    async (recipeId: string, text: string) => {
      if (!isAuthenticated || !user) {
        throw new Error("You must be logged in to comment.");
      }
      if (!text.trim()) return;
      await apiRequest("/comments/", {
        method: "POST",
        body: JSON.stringify({ recipe: recipeId, text: text.trim() }),
      });
      await refreshRecipe(recipeId);
    },
    [isAuthenticated, refreshRecipe, user],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const comment = comments.find((entry) => entry.id === commentId);
      if (!comment) return;
      await apiRequest(`/comments/${commentId}/`, { method: "DELETE" });
      await refreshRecipe(comment.recipeId);
    },
    [comments, refreshRecipe],
  );

  const getRecipeComments = useCallback(
    (recipeId: string) =>
      comments
        .filter((comment) => comment.recipeId === recipeId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [comments],
  );

  const getRecipeSocialData = useCallback(
    (recipeId: string): RecipeSocialData => {
      const { average, count } = getAverageRating(recipeId);
      return {
        averageRating: average,
        ratingCount: count,
        userRating: getUserRating(recipeId),
        comments: getRecipeComments(recipeId),
        isFavorite: isFavorite(recipeId),
      };
    },
    [getAverageRating, getRecipeComments, getUserRating, isFavorite],
  );

  return (
    <SocialContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        ratings,
        rateRecipe,
        getAverageRating,
        getUserRating,
        comments,
        addComment,
        deleteComment,
        getRecipeComments,
        getRecipeSocialData,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error("useSocial must be used within SocialProvider");
  return context;
}
