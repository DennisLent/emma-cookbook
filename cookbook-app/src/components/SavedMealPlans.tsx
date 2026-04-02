// Saved meal-plan list used by the meal-plan page to reload and manage prior plans.

import { useState } from "react";
import { Calendar, Trash2, FolderOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SavedMealPlan } from "@/hooks/useSavedMealPlans";

type SavedMealPlansProps = {
  plans: SavedMealPlan[];
  onLoad: (plan: SavedMealPlan) => void;
  onDelete: (id: string) => void;
};

export default function SavedMealPlans({ plans, onLoad, onDelete }: SavedMealPlansProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (plans.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No saved meal plans yet. Generate a plan and save it to access it later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {plans.map((plan) => {
          const uniqueRecipes = new Set(
            plan.entries.filter((e) => e.recipeId).map((e) => e.recipeId)
          ).size;

          return (
            <Card
              key={plan.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onLoad(plan)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{plan.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDate(plan.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {plan.days} {plan.days === 1 ? "day" : "days"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {uniqueRecipes} {uniqueRecipes === 1 ? "recipe" : "recipes"}
                      </Badge>
                      {plan.dietaryFilters.map((f) => (
                        <Badge key={f} variant="outline" className="text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(plan.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this meal plan. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDelete(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
