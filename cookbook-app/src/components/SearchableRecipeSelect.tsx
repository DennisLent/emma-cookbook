import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Recipe } from "@/types/recipe";

interface SearchableRecipeSelectProps {
  label: string;
  icon?: React.ReactNode;
  recipes: Recipe[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
}

export default function SearchableRecipeSelect({
  label,
  icon,
  recipes,
  selectedIds,
  onToggle,
  placeholder = "Search…",
}: SearchableRecipeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [open]);

  const filtered = query.trim()
    ? recipes.filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase())
      )
    : recipes;

  const selectedRecipes = recipes.filter((r) => selectedIds.includes(r.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-auto min-h-10"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              {icon}
              {selectedIds.length === 0
                ? label
                : `${selectedIds.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No results found
              </p>
            ) : (
              filtered.map((recipe) => {
                const isSelected = selectedIds.includes(recipe.id);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => onToggle(recipe.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{recipe.title}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedRecipes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedRecipes.map((r) => (
            <Badge key={r.id} variant="secondary" className="gap-1 pr-1">
              {r.title}
              <button
                type="button"
                onClick={() => onToggle(r.id)}
                className="ml-0.5 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
