import { useState, useMemo } from "react";
import { Trash2, Plus, Download, CheckSquare, Square, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Recipe, Ingredient } from "@/types/recipe";
import jsPDF from "jspdf";

type ShoppingItem = {
  id: string;
  text: string;
  checked: boolean;
  category: string;
};

/** Rough heuristic to bucket items by aisle/category */
const categorizeItem = (item: string): string => {
  const lower = item.toLowerCase();
  const produce = ["lettuce", "tomato", "cucumber", "onion", "garlic", "pepper", "carrot", "spinach", "basil", "cilantro", "ginger", "lemon", "lime", "avocado", "banana", "blueberr", "berr", "mushroom", "zucchini", "eggplant", "cauliflower", "broccoli", "bean sprout", "green onion", "chive", "dill", "rosemary", "thyme", "parsley"];
  const dairy = ["butter", "cheese", "milk", "cream", "yogurt", "egg", "mozzarella", "feta", "parmesan", "gruyère", "pecorino"];
  const meat = ["chicken", "beef", "ground beef", "salmon", "shrimp", "cod", "guanciale", "pancetta", "anchovy"];
  const pantry = ["flour", "sugar", "salt", "pepper", "oil", "vinegar", "soy sauce", "fish sauce", "oyster sauce", "tamarind", "curry", "garam masala", "cumin", "paprika", "chili", "baking", "vanilla", "cornstarch", "honey", "maple", "miso", "tahini", "peanut butter", "chocolate", "cocoa"];
  const grains = ["rice", "noodle", "pasta", "spaghetti", "tortilla", "bread", "oat", "granola", "crouton"];
  const canned = ["coconut milk", "chickpea", "tomato sauce", "crushed tomato", "dashi", "broth", "stock", "bamboo shoot"];

  if (produce.some((p) => lower.includes(p))) return "Produce";
  if (dairy.some((d) => lower.includes(d))) return "Dairy & Eggs";
  if (meat.some((m) => lower.includes(m))) return "Meat & Seafood";
  if (canned.some((c) => lower.includes(c))) return "Canned & Jarred";
  if (grains.some((g) => lower.includes(g))) return "Grains & Bread";
  if (pantry.some((p) => lower.includes(p))) return "Pantry";
  return "Other";
};

const formatIngredient = (ing: Ingredient): string => {
  const parts: string[] = [];
  if (ing.qty) parts.push(ing.qty);
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.item);
  if (ing.note) parts.push(`(${ing.note})`);
  return parts.join(" ");
};

/**
 * Merge ingredients from multiple recipes, combining items with the same name.
 * If quantities can't be trivially merged, they're listed together.
 */
const buildShoppingItems = (recipes: (Recipe | null)[]): ShoppingItem[] => {
  const mergedMap = new Map<string, { texts: string[]; category: string }>();

  for (const recipe of recipes) {
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      const key = ing.item.toLowerCase().trim();
      const text = formatIngredient(ing);
      const category = categorizeItem(ing.item);

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key)!;
        // Avoid exact duplicates
        if (!existing.texts.includes(text)) {
          existing.texts.push(text);
        }
      } else {
        mergedMap.set(key, { texts: [text], category });
      }
    }
  }

  const items: ShoppingItem[] = [];
  mergedMap.forEach((value, key) => {
    items.push({
      id: key,
      text: value.texts.join(" + "),
      checked: false,
      category: value.category,
    });
  });

  return items.sort((a, b) => a.category.localeCompare(b.category) || a.text.localeCompare(b.text));
};

const CATEGORY_ORDER = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Seafood",
  "Grains & Bread",
  "Canned & Jarred",
  "Pantry",
  "Other",
];

type ShoppingListProps = {
  recipes: (Recipe | null)[];
  onClose: () => void;
};

export default function ShoppingList({ recipes, onClose }: ShoppingListProps) {
  const initialItems = useMemo(() => buildShoppingItems(recipes), [recipes]);
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [newItemText, setNewItemText] = useState("");

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    const newItem: ShoppingItem = {
      id: `custom-${Date.now()}`,
      text,
      checked: false,
      category: categorizeItem(text),
    };
    setItems((prev) => [...prev, newItem].sort((a, b) => a.category.localeCompare(b.category)));
    setNewItemText("");
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    for (const item of items) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [items]);

  const checkedCount = items.filter((i) => i.checked).length;

  const downloadPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Shopping List", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(`${items.length} items · Generated ${new Date().toLocaleDateString()}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 12;

    const sortedCategories = CATEGORY_ORDER.filter((c) => groupedItems[c]);

    for (const category of sortedCategories) {
      const categoryItems = groupedItems[category];
      if (!categoryItems) continue;

      // Check if we need a new page
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      // Category header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(category.toUpperCase(), margin, y);
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      for (const item of categoryItems) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        // Checkbox
        const checkboxSize = 3.5;
        doc.setDrawColor(150, 150, 150);
        doc.rect(margin, y - checkboxSize + 0.5, checkboxSize, checkboxSize);
        if (item.checked) {
          doc.setFont("helvetica", "bold");
          doc.text("✓", margin + 0.5, y);
          doc.setFont("helvetica", "normal");
        }

        // Item text
        const textX = margin + checkboxSize + 4;
        const maxWidth = pageWidth - textX - margin;
        const lines = doc.splitTextToSize(item.text, maxWidth);
        
        if (item.checked) {
          doc.setTextColor(160, 160, 160);
        }
        doc.text(lines, textX, y);
        doc.setTextColor(0, 0, 0);

        y += lines.length * 6 + 2;
      }

      y += 4;
    }

    doc.save(`shopping-list-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Shopping List</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} items · {checkedCount} checked
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Back to Plan
          </Button>
          <Button onClick={downloadPdf}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Add new item */}
      <Card>
        <CardContent className="pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addItem();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Add an item…"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" variant="secondary" disabled={!newItemText.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Items by category */}
      {CATEGORY_ORDER.filter((cat) => groupedItems[cat]).map((category) => (
        <Card key={category}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
              {category}
              <Badge variant="secondary" className="ml-2">
                {groupedItems[category].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {groupedItems[category].map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <Separator className="my-1" />}
                <div className="flex items-center gap-3 py-2 group">
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={item.checked ? "Uncheck item" : "Check item"}
                  >
                    {item.checked ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      item.checked ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {item.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Your shopping list is empty. Add items above or go back and generate a meal plan.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}