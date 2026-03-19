import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { RecipeDetail } from "@/components/RecipeDetail";
import { Recipe } from "@/types/recipe";

vi.mock("@/hooks/useRecipes", () => ({
  useRecipes: () => ({
    recipes: [
      {
        id: "main-1",
        title: "Main Dish",
        description: "Main description",
        servings: 4,
        tags: ["Dinner"],
        ingredients: [{ item: "chicken" }],
        steps: [{ order: 1, text: "Cook it" }],
        suggestedSideIds: ["side-1"],
        suggestedSauceIds: ["sauce-1"],
      },
      {
        id: "side-1",
        title: "Green Salad",
        description: "Fresh and crisp",
        servings: 2,
        tags: ["Side"],
        ingredients: [{ item: "lettuce" }],
        steps: [{ order: 1, text: "Toss" }],
        isSide: true,
      },
      {
        id: "sauce-1",
        title: "Garlic Yogurt Sauce",
        description: "Tangy sauce",
        servings: 2,
        tags: ["Sauce"],
        ingredients: [{ item: "yogurt" }],
        steps: [{ order: 1, text: "Mix" }],
        isSauce: true,
      },
    ] as Recipe[],
    deleteRecipe: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("@/hooks/useSocial", () => ({
  useSocial: () => ({
    getAverageRating: () => ({ average: 4.5, count: 2 }),
    getUserRating: () => 4,
    rateRecipe: vi.fn().mockResolvedValue(undefined),
    isFavorite: () => false,
    toggleFavorite: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock("@/hooks/useCollections", () => ({
  useCollections: () => ({
    collections: [],
    addToCollection: vi.fn(),
    removeFromCollection: vi.fn(),
    isInCollection: () => false,
  }),
}));

vi.mock("@/components/CommentSection", () => ({
  CommentSection: ({ recipeId }: { recipeId: string }) => <div>Comments for {recipeId}</div>,
}));

vi.mock("@/components/StarRating", () => ({
  StarRating: () => <div>Rating widget</div>,
}));

describe("RecipeDetail", () => {
  const recipe: Recipe = {
    id: "main-1",
    title: "Main Dish",
    description: "Main description",
    servings: 4,
    tags: ["Dinner"],
    ingredients: [{ item: "chicken" }],
    steps: [{ order: 1, text: "Cook it" }],
    suggestedSideIds: ["side-1"],
    suggestedSauceIds: ["sauce-1"],
  };

  it("renders persisted side and sauce suggestions", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RecipeDetail recipe={recipe} onClose={vi.fn()} onStartCookMode={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Suggested Sides")).toBeInTheDocument();
    expect(screen.getByText("Green Salad")).toBeInTheDocument();
    expect(screen.getByText("Suggested Sauces & Condiments")).toBeInTheDocument();
    expect(screen.getByText("Garlic Yogurt Sauce")).toBeInTheDocument();

    await user.click(screen.getByText("Start Cook Mode"));
  });
});
