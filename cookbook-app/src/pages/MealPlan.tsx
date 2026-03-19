import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Calendar, UtensilsCrossed, ShoppingCart, Save, FolderOpen, Salad, Droplets, ChevronDown } from "lucide-react";
import ShoppingListView from "@/components/ShoppingList";
import SavedMealPlans from "@/components/SavedMealPlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRecipes } from "@/hooks/useRecipes";
import { useSavedMealPlans, SavedMealPlan } from "@/hooks/useSavedMealPlans";
import { Recipe } from "@/types/recipe";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/api";

type MealType = "breakfast" | "lunch" | "dinner";

type MealPlanEntry = {
  day: number;
  mealType: MealType;
  recipe: Recipe | null;
  sides: Recipe[];
  sauces: Recipe[];
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian", tag: "Vegetarian" },
  { id: "vegan", label: "Vegan", tag: "Vegan" },
  { id: "healthy", label: "Healthy", tag: "Healthy" },
  { id: "seafood-free", label: "No Seafood", excludeTag: "Seafood" },
  { id: "spicy-free", label: "No Spicy", excludeTag: "Spicy" },
] as const;

type DietaryOption = (typeof DIETARY_OPTIONS)[number];

type ViewMode = "config" | "plan" | "shopping" | "saved";

type PlannedEntryResponse = {
  day: number;
  mealType: MealType;
  recipe: Recipe | null;
};

function normalizeRecipe(recipe: Recipe | null): Recipe | null {
  if (!recipe) return null;
  return {
    ...recipe,
    id: String(recipe.id),
    suggestedSideIds: (recipe.suggestedSideIds || []).map((id) => String(id)),
    suggestedSauceIds: (recipe.suggestedSauceIds || []).map((id) => String(id)),
  };
}

const MealPlan = () => {
  const navigate = useNavigate();
  const { recipes } = useRecipes();
  const { savedPlans, savePlan, deletePlan } = useSavedMealPlans();
  const { toast } = useToast();

  const [days, setDays] = useState(7);
  const [selectedMealTypes, setSelectedMealTypes] = useState<Set<MealType>>(
    new Set(["breakfast", "lunch", "dinner"])
  );
  const [dietaryFilters, setDietaryFilters] = useState<Set<string>>(new Set());
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("config");
  const [isGenerating, setIsGenerating] = useState(false);

  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [planName, setPlanName] = useState("");

  const mealPlanRecipes = useMemo(
    () => mealPlan.flatMap((entry) => [entry.recipe, ...entry.sides, ...entry.sauces].filter(Boolean)) as Recipe[],
    [mealPlan]
  );

  const toggleMealType = (mealType: MealType) => {
    const newTypes = new Set(selectedMealTypes);
    if (newTypes.has(mealType)) {
      if (newTypes.size > 1) newTypes.delete(mealType);
    } else {
      newTypes.add(mealType);
    }
    setSelectedMealTypes(newTypes);
  };

  const toggleDietaryFilter = (id: string) => {
    const next = new Set(dietaryFilters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDietaryFilters(next);
  };

  const mainRecipes = useMemo(() => recipes.filter((r) => !r.isSide && !r.isSauce), [recipes]);

  const sideRecipes = useMemo(() => recipes.filter((r) => r.isSide), [recipes]);
  const sauceRecipes = useMemo(() => recipes.filter((r) => r.isSauce), [recipes]);

  const generateMealPlan = async () => {
    setIsGenerating(true);
    try {
      const sortedMealTypes = (["breakfast", "lunch", "dinner"] as MealType[]).filter((mt) =>
        selectedMealTypes.has(mt),
      );
      const response = await apiRequest<{ entries: PlannedEntryResponse[] }>("/recipes/plan/", {
        method: "POST",
        body: JSON.stringify({
          days,
          meal_types: sortedMealTypes,
          dietary_filters: Array.from(dietaryFilters),
        }),
      });

      const newPlan: MealPlanEntry[] = response.entries.map((entry) => ({
        day: entry.day,
        mealType: entry.mealType,
        recipe: normalizeRecipe(entry.recipe),
        sides: [],
        sauces: [],
      }));

      if (newPlan.length === 0) {
        toast({
          title: "No meal plan available",
          description: "No recipes matched the current meal-plan settings.",
          variant: "destructive",
        });
        return;
      }

      setMealPlan(newPlan);
      setViewMode("plan");
    } catch (error) {
      toast({
        title: "Failed to generate meal plan",
        description: getApiErrorMessage(error, "The backend could not generate a meal plan."),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const shuffleRecipe = async (day: number, mealType: MealType) => {
    const currentEntry = mealPlan.find((entry) => entry.day === day && entry.mealType === mealType);
    if (!currentEntry?.recipe) return;

    const currentIds = mealPlan
      .filter((entry) => !(entry.day === day && entry.mealType === mealType))
      .map((entry) => entry.recipe?.id)
      .filter(Boolean) as string[];

    try {
      const replacement = normalizeRecipe(
        await apiRequest<Recipe>("/recipes/swap/", {
          method: "POST",
          body: JSON.stringify({
            current_recipe_id: currentEntry.recipe.id,
            existing_plan_ids: currentIds,
            dietary_filters: Array.from(dietaryFilters),
          }),
        }),
      );
      setMealPlan((prev) =>
        prev.map((entry) =>
          entry.day === day && entry.mealType === mealType ? { ...entry, recipe: replacement } : entry,
        ),
      );
    } catch (error) {
      toast({
        title: "Failed to swap meal",
        description: getApiErrorMessage(error, "No replacement recipe could be selected."),
        variant: "destructive",
      });
    }
  };

  const toggleSide = (day: number, mealType: MealType, sideId: string) => {
    setMealPlan((prev) =>
      prev.map((entry) => {
        if (entry.day !== day || entry.mealType !== mealType) return entry;
        const exists = entry.sides.some((s) => s.id === sideId);
        if (exists) return { ...entry, sides: entry.sides.filter((s) => s.id !== sideId) };
        const side = sideRecipes.find((r) => r.id === sideId);
        if (!side) return entry;
        return { ...entry, sides: [...entry.sides, side] };
      })
    );
  };

  const toggleSauce = (day: number, mealType: MealType, sauceId: string) => {
    setMealPlan((prev) =>
      prev.map((entry) => {
        if (entry.day !== day || entry.mealType !== mealType) return entry;
        const exists = entry.sauces.some((s) => s.id === sauceId);
        if (exists) return { ...entry, sauces: entry.sauces.filter((s) => s.id !== sauceId) };
        const sauce = sauceRecipes.find((r) => r.id === sauceId);
        if (!sauce) return entry;
        return { ...entry, sauces: [...entry.sauces, sauce] };
      })
    );
  };

  const getSidesForEntry = (entry: MealPlanEntry): Recipe[] => {
    if (!entry.recipe) return sideRecipes;
    const suggestedIds = new Set(entry.recipe.suggestedSideIds || []);
    const suggested = sideRecipes.filter((s) => suggestedIds.has(s.id));
    const others = sideRecipes.filter((s) => !suggestedIds.has(s.id));
    return [...suggested, ...others];
  };

  const getSaucesForEntry = (entry: MealPlanEntry): Recipe[] => {
    if (!entry.recipe) return sauceRecipes;
    const suggestedIds = new Set(entry.recipe.suggestedSauceIds || []);
    const suggested = sauceRecipes.filter((s) => suggestedIds.has(s.id));
    const others = sauceRecipes.filter((s) => !suggestedIds.has(s.id));
    return [...suggested, ...others];
  };

  const handleSavePlan = () => {
    const name = planName.trim();
    if (!name) return;

    const entries = mealPlan.map((entry) => ({
      day: entry.day,
      mealType: entry.mealType,
      recipeId: entry.recipe?.id ?? null,
      recipeTitle: entry.recipe?.title ?? "No recipe",
      sideIds: entry.sides.map((s) => s.id),
      sideTitles: entry.sides.map((s) => s.title),
      sauceIds: entry.sauces.map((s) => s.id),
      sauceTitles: entry.sauces.map((s) => s.title),
    }));

    const filterLabels = DIETARY_OPTIONS
      .filter((o) => dietaryFilters.has(o.id))
      .map((o) => o.label);

    savePlan({
      name,
      days,
      mealTypes: Array.from(selectedMealTypes),
      dietaryFilters: filterLabels,
      entries,
    });

    setShowSaveDialog(false);
    setPlanName("");
    toast({ title: "Meal plan saved!", description: `"${name}" has been saved.` });
  };

  const handleLoadPlan = (plan: SavedMealPlan) => {
    // Rebuild MealPlanEntry[] from saved data, matching recipes by ID
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    const loadedPlan: MealPlanEntry[] = plan.entries.map((entry) => ({
      day: entry.day,
      mealType: entry.mealType,
      recipe: entry.recipeId ? (recipeMap.get(entry.recipeId) ?? null) : null,
      sides: (entry.sideIds || [])
        .map((id) => recipeMap.get(id))
        .filter(Boolean) as Recipe[],
      sauces: (entry.sauceIds || [])
        .map((id) => recipeMap.get(id))
        .filter(Boolean) as Recipe[],
    }));

    setMealPlan(loadedPlan);
    setDays(plan.days);
    setSelectedMealTypes(new Set(plan.mealTypes));
    setViewMode("plan");

    // Check for missing recipes
    const missing = plan.entries.filter(
      (e) => e.recipeId && !recipeMap.has(e.recipeId)
    );

    if (missing.length > 0) {
      toast({
        title: "Some recipes unavailable",
        description: `${missing.length} recipe(s) were removed from your collection and couldn't be loaded.`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Meal plan loaded!", description: `"${plan.name}" is ready.` });
    }
  };

  const groupedByDay = useMemo(() => {
    const grouped: Record<number, MealPlanEntry[]> = {};
    mealPlan.forEach((entry) => {
      if (!grouped[entry.day]) grouped[entry.day] = [];
      grouped[entry.day].push(entry);
    });
    return grouped;
  }, [mealPlan]);

  const defaultPlanName = `Meal Plan – ${new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold">Meal Planner</h1>
              </div>
            </div>
            {viewMode === "config" && savedPlans.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setViewMode("saved")}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Saved ({savedPlans.length})
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {viewMode === "config" && (
          /* Configuration View */
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plan Duration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Number of days</span>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {days} {days === 1 ? "day" : "days"}
                  </Badge>
                </div>
                <Slider
                  value={[days]}
                  onValueChange={(value) => setDays(value[0])}
                  min={1}
                  max={7}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 day</span>
                  <span>7 days</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meal Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(["breakfast", "lunch", "dinner"] as MealType[]).map((mealType) => (
                    <div key={mealType} className="flex items-center space-x-3">
                      <Checkbox
                        id={mealType}
                        checked={selectedMealTypes.has(mealType)}
                        onCheckedChange={() => toggleMealType(mealType)}
                        disabled={selectedMealTypes.has(mealType) && selectedMealTypes.size === 1}
                      />
                      <Label htmlFor={mealType} className="text-base font-medium cursor-pointer">
                        {MEAL_TYPE_LABELS[mealType]}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dietary Restrictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {DIETARY_OPTIONS.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={option.id}
                        checked={dietaryFilters.has(option.id)}
                        onCheckedChange={() => toggleDietaryFilter(option.id)}
                      />
                      <Label htmlFor={option.id} className="text-base font-medium cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {dietaryFilters.size > 0 && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Dietary filters are applied by the backend when generating the plan.
                  </p>
                )}
              </CardContent>
            </Card>

            {mainRecipes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    You need to add some main-dish recipes before creating a meal plan.
                  </p>
                  <Button className="mt-4" onClick={() => navigate("/add")}>
                    Add Your First Recipe
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Button size="lg" className="w-full" onClick={() => void generateMealPlan()} disabled={isGenerating}>
                <Calendar className="w-5 h-5 mr-2" />
                {isGenerating ? "Generating..." : "Generate Meal Plan"}
              </Button>
            )}
          </div>
        )}

        {viewMode === "saved" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Saved Meal Plans</h2>
              <Button variant="outline" onClick={() => setViewMode("config")}>
                Back
              </Button>
            </div>
            <SavedMealPlans
              plans={savedPlans}
              onLoad={handleLoadPlan}
              onDelete={deletePlan}
            />
          </div>
        )}

        {viewMode === "shopping" && (
          <ShoppingListView
            recipes={mealPlanRecipes}
            onClose={() => setViewMode("plan")}
          />
        )}

        {viewMode === "plan" && (
          /* Generated Plan View */
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold">Your Meal Plan</h2>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setViewMode("config")}>
                  Edit Settings
                </Button>
                <Button variant="outline" onClick={() => void generateMealPlan()} disabled={isGenerating}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isGenerating ? "Generating..." : "Regenerate"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPlanName(defaultPlanName);
                    setShowSaveDialog(true);
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button onClick={() => setViewMode("shopping")}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Shopping List
                </Button>
              </div>
            </div>

            {dietaryFilters.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.filter((o) => dietaryFilters.has(o.id)).map((o) => (
                  <Badge key={o.id} variant="secondary">
                    {o.label}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {Object.entries(groupedByDay).map(([dayStr, entries]) => {
                const day = parseInt(dayStr);
                return (
                  <Card key={day}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium">
                        {DAY_LABELS[day % 7]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {entries.map((entry) => {
                        const availableSides = getSidesForEntry(entry);
                        const availableSauces = getSaucesForEntry(entry);
                        const hasSuggestedSides = entry.recipe?.suggestedSideIds && entry.recipe.suggestedSideIds.length > 0;
                        const hasSuggestedSauces = entry.recipe?.suggestedSauceIds && entry.recipe.suggestedSauceIds.length > 0;
                        return (
                          <div
                            key={`${entry.day}-${entry.mealType}`}
                            className="p-3 rounded-lg bg-muted/50 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                                  {MEAL_TYPE_LABELS[entry.mealType]}
                                </p>
                                {entry.recipe ? (
                                  <p className="font-medium truncate">{entry.recipe.title}</p>
                                ) : (
                                  <p className="text-muted-foreground italic">No recipe available</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void shuffleRecipe(entry.day, entry.mealType)}
                                className="shrink-0 ml-2"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Side dish selector */}
                            {entry.recipe && hasSuggestedSides && availableSides.length > 0 && (
                              <div className="pl-1 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Salad className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs text-muted-foreground">Sides</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {availableSides.map((s) => {
                                    const isSelected = entry.sides.some((side) => side.id === s.id);
                                    const isSuggested = entry.recipe!.suggestedSideIds!.includes(s.id);
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => toggleSide(entry.day, entry.mealType, s.id)}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                                          isSelected
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background border-border hover:bg-muted"
                                        }`}
                                      >
                                        {isSuggested && "⭐ "}{s.title}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Sauce selector */}
                            {entry.recipe && hasSuggestedSauces && availableSauces.length > 0 && (
                              <div className="pl-1 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Droplets className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs text-muted-foreground">Sauces</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {availableSauces.map((s) => {
                                    const isSelected = entry.sauces.some((sauce) => sauce.id === s.id);
                                    const isSuggested = entry.recipe!.suggestedSauceIds!.includes(s.id);
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => toggleSauce(entry.day, entry.mealType, s.id)}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                                          isSelected
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background border-border hover:bg-muted"
                                        }`}
                                      >
                                        {isSuggested && "⭐ "}{s.title}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Meal Plan</DialogTitle>
            <DialogDescription>
              Give your meal plan a name so you can find it later.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSavePlan();
            }}
          >
            <Input
              placeholder="e.g. Healthy Week, Family Dinners…"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              autoFocus
              className="mb-4"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!planName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealPlan;
