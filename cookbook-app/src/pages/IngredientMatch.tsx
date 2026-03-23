import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Plus, ChefHat, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRecipes } from "@/hooks/useRecipes";
import { Recipe } from "@/types/recipe";

/** Normalise an ingredient name for matching (lowercase, trim, strip plurals). */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/es$/, "")
    .replace(/s$/, "");

type MatchedRecipe = {
  recipe: Recipe;
  matched: string[];
  missing: string[];
  pct: number;
};

const IngredientMatch = () => {
  const navigate = useNavigate();
  const { recipes } = useRecipes();
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Build a unique, sorted list of all ingredient names across recipes
  const allIngredients = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) =>
      r.ingredients.forEach((ing) => set.add(ing.item.toLowerCase().trim()))
    );
    return Array.from(set).sort();
  }, [recipes]);

  // Autocomplete suggestions filtered by current input and already-selected items
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return allIngredients.filter((i) => !selectedIngredients.includes(i));
    const q = inputValue.toLowerCase().trim();
    return allIngredients.filter(
      (i) => i.includes(q) && !selectedIngredients.includes(i)
    );
  }, [inputValue, allIngredients, selectedIngredients]);

  const addIngredient = useCallback(
    (ingredient: string) => {
      const normalised = ingredient.toLowerCase().trim();
      if (!normalised || selectedIngredients.includes(normalised)) return;
      setSelectedIngredients((prev) => [...prev, normalised]);
      setInputValue("");
      setPopoverOpen(false);
    },
    [selectedIngredients]
  );

  const removeIngredient = useCallback((ingredient: string) => {
    setSelectedIngredients((prev) => prev.filter((i) => i !== ingredient));
  }, []);

  // Match recipes – rank by percentage of ingredients the user already has
  const matchedRecipes = useMemo<MatchedRecipe[]>(() => {
    if (selectedIngredients.length === 0) return [];

    const selectedNorms = new Set(selectedIngredients.map(normalise));

    return recipes
      .map((recipe) => {
        const recipeItems = recipe.ingredients.map((ing) => ing.item.toLowerCase().trim());
        const matched: string[] = [];
        const missing: string[] = [];

        recipeItems.forEach((item) => {
          const norm = normalise(item);
          // Check if any selected ingredient partially matches
          const isMatched = selectedNorms.has(norm) || selectedIngredients.some(
            (sel) => norm.includes(normalise(sel)) || normalise(sel).includes(norm)
          );
          if (isMatched) matched.push(item);
          else missing.push(item);
        });

        const pct =
          recipeItems.length > 0
            ? Math.round((matched.length / recipeItems.length) * 100)
            : 0;
        return { recipe, matched, missing, pct };
      })
      .filter((m) => m.matched.length > 0)
      .sort((a, b) => b.pct - a.pct || a.missing.length - b.missing.length);
  }, [recipes, selectedIngredients]);

  const handleAddCustom = () => {
    if (inputValue.trim()) {
      addIngredient(inputValue.trim());
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 md:px-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            <h1 className="text-lg sm:text-xl font-bold">Match by Ingredients</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 md:px-6 space-y-6">
        {/* Ingredient Input */}
        <section className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            What ingredients do you have?
          </label>

          <div className="flex gap-2">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative flex-1">
                  <Input
                    placeholder="Type an ingredient…"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (e.target.value.trim()) setPopoverOpen(true);
                    }}
                    onFocus={() => {
                      if (inputValue.trim() || allIngredients.length > 0) setPopoverOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustom();
                      }
                    }}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)]"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command>
                  <CommandList>
                    <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                      {inputValue.trim() ? (
                        <button
                          className="w-full px-2 py-1 text-sm hover:bg-accent rounded cursor-pointer flex items-center gap-2 justify-center"
                          onClick={handleAddCustom}
                        >
                          <Plus className="w-3 h-3" />
                          Add "{inputValue.trim()}"
                        </button>
                      ) : (
                        "Start typing…"
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {suggestions.slice(0, 12).map((item) => (
                        <CommandItem
                          key={item}
                          value={item}
                          onSelect={() => addIngredient(item)}
                          className="cursor-pointer"
                        >
                          {item}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button onClick={handleAddCustom} disabled={!inputValue.trim()} size="icon" className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Selected chips */}
          {selectedIngredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((ing) => (
                <Badge
                  key={ing}
                  variant="secondary"
                  className="gap-1 pr-1 text-sm capitalize"
                >
                  {ing}
                  <button
                    onClick={() => removeIngredient(ing)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setSelectedIngredients([])}
              >
                Clear all
              </Button>
            </div>
          )}
        </section>

        {/* Results */}
        {selectedIngredients.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ChefHat className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Add ingredients you have on hand to find matching recipes.
            </p>
          </div>
        ) : matchedRecipes.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground">
              No recipes match your current ingredients. Try adding more!
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {matchedRecipes.length} {matchedRecipes.length === 1 ? "recipe" : "recipes"} found
            </h2>

            <div className="space-y-3">
              {matchedRecipes.map(({ recipe, matched, missing, pct }) => (
                <Card
                  key={recipe.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <ChefHat className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-semibold text-base truncate">
                          {recipe.title}
                        </h3>
                        {recipe.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="flex-1 h-2" />
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {pct}% match
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Matched / Missing breakdown */}
                    <div className="flex flex-wrap gap-1.5">
                      {matched.map((item) => (
                        <Badge
                          key={item}
                          variant="default"
                          className="text-xs capitalize"
                        >
                          ✓ {item}
                        </Badge>
                      ))}
                      {missing.map((item) => (
                        <Badge
                          key={item}
                          variant="outline"
                          className="text-xs capitalize opacity-60"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default IngredientMatch;
