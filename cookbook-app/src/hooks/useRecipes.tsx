import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Recipe } from "@/types/recipe";
import { apiRequest } from "@/lib/api";

type RecipesContextType = {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, "id">) => Promise<Recipe>;
  updateRecipe: (id: string, recipe: Omit<Recipe, "id">) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<boolean>;
  exportRecipes: () => void;
  importRecipes: (data: Recipe[]) => Promise<void>;
  refreshRecipes: () => Promise<void>;
  refreshRecipe: (id: string) => Promise<void>;
};

const RecipesContext = createContext<RecipesContextType | undefined>(undefined);

type RecipesListResponse = { results?: Recipe[] } | Recipe[];

function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    id: String(recipe.id),
    suggestedSideIds: (recipe.suggestedSideIds || []).map((id) => String(id)),
    suggestedSauceIds: (recipe.suggestedSauceIds || []).map((id) => String(id)),
    ratings: (recipe.ratings || []).map((rating) => ({
      ...rating,
      recipeId: String(rating.recipeId),
      userId: String(rating.userId),
    })),
    comments: (recipe.comments || []).map((comment) => ({
      ...comment,
      id: String(comment.id),
      recipeId: String(comment.recipeId),
      userId: String(comment.userId),
    })),
  };
}

function normalizeRecipes(payload: RecipesListResponse): Recipe[] {
  const recipes = Array.isArray(payload) ? payload : payload.results || [];
  return recipes.map(normalizeRecipe);
}

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const refreshRecipes = async () => {
    const payload = await apiRequest<RecipesListResponse>("/recipes/");
    setRecipes(normalizeRecipes(payload));
  };

  const refreshRecipe = async (id: string) => {
    const recipe = normalizeRecipe(await apiRequest<Recipe>(`/recipes/${id}/`));
    setRecipes((prev) => {
      const exists = prev.some((entry) => entry.id === id);
      if (!exists) return [recipe, ...prev];
      return prev.map((entry) => (entry.id === id ? recipe : entry));
    });
  };

  useEffect(() => {
    refreshRecipes().catch(() => setRecipes([]));
  }, []);

  const addRecipe = async (recipe: Omit<Recipe, "id">) => {
    const created = normalizeRecipe(
      await apiRequest<Recipe>("/recipes/", {
        method: "POST",
        body: JSON.stringify(recipe),
      }),
    );
    setRecipes((prev) => [created, ...prev]);
    return created;
  };

  const updateRecipe = async (id: string, recipe: Omit<Recipe, "id">) => {
    const updated = normalizeRecipe(
      await apiRequest<Recipe>(`/recipes/${id}/`, {
        method: "PUT",
        body: JSON.stringify(recipe),
      }),
    );
    setRecipes((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
    return updated;
  };

  const deleteRecipe = async (id: string) => {
    await apiRequest(`/recipes/${id}/`, { method: "DELETE" });
    setRecipes((prev) => prev.filter((entry) => entry.id !== id));
    return true;
  };

  const exportRecipes = () => {
    const dataStr = JSON.stringify(recipes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cookbook-recipes-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importRecipes = async (data: Recipe[]) => {
    for (const recipe of data) {
      const { id: _id, ...payload } = recipe;
      await addRecipe(payload);
    }
  };

  return (
    <RecipesContext.Provider
      value={{ recipes, addRecipe, updateRecipe, deleteRecipe, exportRecipes, importRecipes, refreshRecipes, refreshRecipe }}
    >
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipesContext);
  if (!context) throw new Error("useRecipes must be used within RecipesProvider");
  return context;
}
