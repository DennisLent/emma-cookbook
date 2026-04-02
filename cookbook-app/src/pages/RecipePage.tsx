// Detail route that switches between full recipe view and cook mode.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RecipeDetail } from "@/components/RecipeDetail";
import { CookMode } from "@/components/CookMode";
import { useRecipes } from "@/hooks/useRecipes";

type ViewMode = "detail" | "cook";

export default function RecipePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { recipes, isLoading, refreshRecipe } = useRecipes();
  const [viewMode, setViewMode] = useState<ViewMode>("detail");

  const recipe = recipes.find((entry) => entry.id === id);

  useEffect(() => {
    if (id && !recipe) {
      refreshRecipe(id).catch(() => undefined);
    }
  }, [id, recipe, refreshRecipe]);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            {isLoading ? "Loading recipe..." : "Recipe not found"}
          </p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (viewMode === "cook") {
    return <CookMode recipe={recipe} onClose={() => setViewMode("detail")} />;
  }

  return (
    <RecipeDetail
      recipe={recipe}
      onClose={() => navigate("/")}
      onStartCookMode={() => setViewMode("cook")}
    />
  );
}
