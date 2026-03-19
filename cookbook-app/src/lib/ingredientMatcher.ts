import { Ingredient } from "@/types/recipe";

/**
 * Auto-match ingredients mentioned in a step's text.
 * Returns indices of matching ingredients.
 * If the step has manual `ingredientIndices`, those take priority.
 */
export function matchIngredientsForStep(
  stepText: string,
  ingredients: Ingredient[],
  manualIndices?: number[]
): number[] {
  if (manualIndices && manualIndices.length > 0) {
    return manualIndices;
  }

  const textLower = stepText.toLowerCase();
  const matched: number[] = [];

  ingredients.forEach((ing, idx) => {
    const item = ing.item.toLowerCase().trim();
    if (!item) return;

    // Try matching the full item name
    if (textLower.includes(item)) {
      matched.push(idx);
      return;
    }

    // Try matching individual significant words (3+ chars) from the item name
    const words = item.split(/\s+/).filter((w) => w.length >= 3);
    // Require at least one significant word to match
    for (const word of words) {
      // Skip very common cooking words to avoid false matches
      const skipWords = new Set([
        "and", "the", "for", "with", "fresh", "dried", "ground",
        "large", "small", "medium", "taste", "extra", "cups", "cup",
      ]);
      if (skipWords.has(word)) continue;

      if (textLower.includes(word)) {
        matched.push(idx);
        return;
      }
    }
  });

  return matched;
}
