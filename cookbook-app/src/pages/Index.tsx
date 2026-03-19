import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ChefHat, Plus, Settings as SettingsIcon, LogIn, User, Heart, Star, Calendar, UtensilsCrossed, FolderPlus, ChevronLeft, ChevronRight, X, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeDetail } from "@/components/RecipeDetail";
import { CookMode } from "@/components/CookMode";
import { useRecipes } from "@/hooks/useRecipes";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { useSocial } from "@/hooks/useSocial";
import { useCollections } from "@/hooks/useCollections";
import { Recipe } from "@/types/recipe";

type ViewMode = "browse" | "detail" | "cook";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { recipes } = useRecipes();
  const { settings } = useSettings();
  const { user, isAuthenticated, logout } = useAuth();
  const { isFavorite, getAverageRating } = useSocial();
  const { collections, createCollection, deleteCollection } = useCollections();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const tagScrollRef = useRef<HTMLDivElement>(null);

  // Auto-open recipe from navigation state
  useEffect(() => {
    const recipeId = location.state?.recipeId;
    if (recipeId) {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (recipe) {
        setSelectedRecipe(recipe);
        setViewMode("detail");
      }
      window.history.replaceState({}, "");
    }
  }, [location.state, recipes]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    recipes.forEach((recipe) => recipe.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        recipe.title.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
        recipe.ingredients.some((ing) => ing.item.toLowerCase().includes(searchLower));

      const matchesTags =
        selectedTags.size === 0 ||
        recipe.tags.some((tag) => selectedTags.has(tag));

      const matchesFavorites = !showFavoritesOnly || isFavorite(recipe.id);

      const { average } = getAverageRating(recipe.id);
      const matchesRating = minRating === 0 || average >= minRating;

      const matchesCollection =
        !selectedCollectionId ||
        collections.find((c) => c.id === selectedCollectionId)?.recipeIds.includes(recipe.id);

      return matchesSearch && matchesTags && matchesFavorites && matchesRating && matchesCollection;
    });
  }, [recipes, searchQuery, selectedTags, showFavoritesOnly, minRating, selectedCollectionId, isFavorite, getAverageRating, collections]);

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) newTags.delete(tag);
    else newTags.add(tag);
    setSelectedTags(newTags);
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setViewMode("detail");
  };

  const handleCloseBrowse = () => {
    setViewMode("browse");
    setSelectedRecipe(null);
  };

  const handleStartCookMode = () => setViewMode("cook");

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const getInitials = () => {
    if (!user) return "";
    return user.name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const scrollTags = (direction: "left" | "right") => {
    if (tagScrollRef.current) {
      tagScrollRef.current.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollection(newCollectionName.trim());
      setNewCollectionName("");
      setShowNewCollectionDialog(false);
    }
  };

  if (viewMode === "cook" && selectedRecipe) {
    return <CookMode recipe={selectedRecipe} onClose={handleCloseBrowse} />;
  }

  if (viewMode === "detail" && selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onClose={handleCloseBrowse}
        onStartCookMode={handleStartCookMode}
      />
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <ChefHat className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold truncate">{settings.siteTitle}</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => navigate("/match")} className="hidden sm:inline-flex">
                <UtensilsCrossed className="w-4 h-4 mr-2" />
                Match
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/match")} className="sm:hidden h-9 w-9">
                <UtensilsCrossed className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/meal-plan")} className="hidden sm:inline-flex">
                Meal Plan
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/meal-plan")} className="sm:hidden h-9 w-9">
                <Calendar className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="hidden sm:inline-flex">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/settings")} className="sm:hidden h-9 w-9">
                <SettingsIcon className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={() => navigate("/add")} className="hidden sm:inline-flex">
                <Plus className="w-4 h-4 mr-2" />
                Add Recipe
              </Button>
              <Button size="icon" onClick={() => navigate("/add")} className="sm:hidden h-9 w-9">
                <Plus className="w-4 h-4" />
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatarUrl} />
                        <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-sm text-muted-foreground">@{user?.username}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" size="icon" onClick={() => navigate("/login")} className="sm:hidden h-9 w-9">
                  <LogIn className="w-4 h-4" />
                </Button>
              )}
              {!isAuthenticated && (
                <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="hidden sm:inline-flex">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search recipes..."
              className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6">
        {/* Advanced Filters */}
        {isAuthenticated && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <Toggle
              pressed={showFavoritesOnly}
              onPressedChange={setShowFavoritesOnly}
              className="gap-2"
              aria-label="Show favorites only"
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
              Favorites
            </Toggle>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-muted-foreground" />
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="text-sm bg-background border border-input rounded-md px-2 py-1"
              >
                <option value={0}>Any rating</option>
                <option value={4}>4+ stars</option>
                <option value={3}>3+ stars</option>
                <option value={2}>2+ stars</option>
                <option value={1}>1+ stars</option>
              </select>
            </div>
          </div>
        )}

        {/* Collections */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5" />
              Collections
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowNewCollectionDialog(true)}
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1" />
              New
            </Button>
          </div>
          {collections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {collections.map((col) => (
                <div key={col.id} className="flex items-center gap-0.5">
                  <Badge
                    variant={selectedCollectionId === col.id ? "default" : "outline"}
                    className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                    onClick={() =>
                      setSelectedCollectionId(selectedCollectionId === col.id ? null : col.id)
                    }
                  >
                    {col.name}
                    <span className="ml-1 opacity-60">{col.recipeIds.length}</span>
                  </Badge>
                  <button
                    onClick={() => {
                      if (selectedCollectionId === col.id) setSelectedCollectionId(null);
                      deleteCollection(col.id);
                    }}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Create collections like "Quick weeknight meals" or "Guests" to organize your recipes.
            </p>
          )}
        </div>

        {/* Tag Filters — Scrollable Row */}
        {allTags.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Filter by tags</h2>
            <div className="relative group">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-7 w-7 bg-background/80 backdrop-blur shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => scrollTags("left")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div
                ref={tagScrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.has(tag) ? "default" : "outline"}
                    className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground whitespace-nowrap shrink-0"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-7 w-7 bg-background/80 backdrop-blur shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => scrollTags("right")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear tags
              </button>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredRecipes.length} {filteredRecipes.length === 1 ? "recipe" : "recipes"}
          {(searchQuery || selectedTags.size > 0 || selectedCollectionId) && " found"}
        </div>

        {/* Recipe Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => handleRecipeClick(recipe)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No recipes found matching your search.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try different keywords or clear your filters.
            </p>
          </div>
        )}
      </main>

      {/* New Collection Dialog */}
      <Dialog open={showNewCollectionDialog} onOpenChange={setShowNewCollectionDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <Input
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder='e.g., "Quick weeknight meals"'
            onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCollectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection} disabled={!newCollectionName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
