// Drag-and-drop editor for ordering and annotating recipe steps.

import { useRef, useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Upload, X, Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Step, Ingredient } from "@/types/recipe";
import { matchIngredientsForStep } from "@/lib/ingredientMatcher";
import { toast } from "@/hooks/use-toast";

type Props = {
  steps: Step[];
  setSteps: (steps: Step[]) => void;
  ingredients?: Ingredient[];
  idPrefix?: string;
};

function SortableStep({
  step,
  index,
  stepsCount,
  ingredients,
  onUpdate,
  onRemove,
  onImageUpload,
  onSetIngredientIndices,
  idPrefix,
}: {
  step: Step;
  index: number;
  stepsCount: number;
  ingredients: Ingredient[];
  onUpdate: (index: number, field: keyof Step, value: string) => void;
  onRemove: (index: number) => void;
  onImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetIngredientIndices: (index: number, indices: number[] | undefined) => void;
  idPrefix: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.order.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasManualLinks = step.ingredientIndices && step.ingredientIndices.length > 0;
  const autoMatched = useMemo(
    () => matchIngredientsForStep(step.text, ingredients),
    [step.text, ingredients]
  );
  const activeIndices = hasManualLinks ? step.ingredientIndices! : autoMatched;
  const validIngredients = ingredients.filter((ing) => ing.item.trim());

  const toggleIngredient = (ingIdx: number, checked: boolean) => {
    const current = step.ingredientIndices ?? [...autoMatched];
    const next = checked
      ? [...current, ingIdx]
      : current.filter((i) => i !== ingIdx);
    onSetIngredientIndices(index, next.length > 0 ? next : undefined);
  };

  const resetToAuto = () => {
    onSetIngredientIndices(index, undefined);
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2">
      <button
        type="button"
        className="w-8 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-8 h-10 flex items-center justify-center text-sm font-medium text-muted-foreground bg-muted rounded">
        {index + 1}
      </div>
      <div className="flex-1 space-y-2">
        <Textarea
          placeholder="Describe this step..."
          value={step.text}
          onChange={(e) => onUpdate(index, "text", e.target.value)}
          rows={2}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onImageUpload(index, e)}
            className="hidden"
            id={`${idPrefix}step-image-${index}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`${idPrefix}step-image-${index}`)?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            Photo
          </Button>

          {/* Ingredient linking popover */}
          {validIngredients.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1">
                  <Link2 className="w-3 h-3" />
                  Ingredients
                  {activeIndices.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {activeIndices.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Link ingredients</p>
                    {hasManualLinks && (
                      <Button type="button" variant="ghost" size="sm" onClick={resetToAuto} className="h-6 text-xs gap-1">
                        <Sparkles className="w-3 h-3" />
                        Auto-detect
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasManualLinks ? "Manual override active" : "Auto-detected from step text"}
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {ingredients.map((ing, ingIdx) => {
                      if (!ing.item.trim()) return null;
                      const label = [ing.qty, ing.unit, ing.item].filter(Boolean).join(" ");
                      const isActive = activeIndices.includes(ingIdx);
                      return (
                        <label key={ingIdx} className="flex items-center gap-2 cursor-pointer py-1">
                          <Checkbox
                            checked={isActive}
                            onCheckedChange={(checked) => toggleIngredient(ingIdx, !!checked)}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Show linked ingredient badges inline */}
          {activeIndices.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeIndices.map((idx) => {
                const ing = ingredients[idx];
                if (!ing) return null;
                return (
                  <Badge key={idx} variant="outline" className="text-xs py-0 h-5">
                    {ing.item}
                  </Badge>
                );
              })}
            </div>
          )}

          {step.imageUrl && (
            <div className="relative inline-block">
              <img src={step.imageUrl} alt={`Step ${index + 1}`} className="h-16 w-24 object-cover rounded border" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                onClick={() => onUpdate(index, "imageUrl", "")}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {stepsCount > 1 && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export default function SortableStepList({ steps, setSteps, ingredients = [], idPrefix = "" }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(newSteps);
  };

  const setIngredientIndices = (index: number, indices: number[] | undefined) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ingredientIndices: indices };
    setSteps(newSteps);
  };

  const handleStepImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      updateStep(index, "imageUrl", event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.order.toString() === active.id);
    const newIndex = steps.findIndex((s) => s.order.toString() === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(reordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((s) => s.order.toString())} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <SortableStep
              key={step.order}
              step={step}
              index={i}
              stepsCount={steps.length}
              ingredients={ingredients}
              onUpdate={updateStep}
              onRemove={removeStep}
              onImageUpload={handleStepImageUpload}
              onSetIngredientIndices={setIngredientIndices}
              idPrefix={idPrefix}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
