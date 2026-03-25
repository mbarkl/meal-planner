"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Clock, Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Recipe, DayOfWeek, MealType } from "@/lib/types";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

interface AddMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: DayOfWeek | null;
  mealType: MealType | null;
  onAdd: (recipeId: string | null, customName: string | null) => Promise<void>;
}

export function AddMealDialog({
  open,
  onOpenChange,
  day,
  mealType,
  onAdd,
}: AddMealDialogProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecipes(data);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchRecipes();
      setSearch("");
      setCustomName("");
    }
  }, [open, fetchRecipes]);

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelectRecipe(recipe: Recipe) {
    setAdding(recipe.id);
    try {
      await onAdd(recipe.id, null);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setAdding(null);
    }
  }

  async function handleAddCustom() {
    if (!customName.trim()) return;
    setAddingCustom(true);
    try {
      await onAdd(null, customName.trim());
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setAddingCustom(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Meal</DialogTitle>
          <DialogDescription>
            {day && mealType
              ? `${DAY_LABELS[day]} ${MEAL_TYPE_LABELS[mealType]}`
              : "Select a recipe from your cookbook"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Custom meal name */}
          <div className="flex gap-2">
            <Input
              placeholder="Or type a custom meal name..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddCustom}
              disabled={!customName.trim() || addingCustom}
              className="shrink-0"
            >
              {addingCustom ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Recipe list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {recipes.length === 0
                ? "No recipes in your cookbook yet. Add some on the Recipes page."
                : "No recipes match your search."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe)}
                  disabled={adding === recipe.id}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {recipe.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {recipe.total_time_minutes && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {recipe.total_time_minutes}m
                        </span>
                      )}
                      {recipe.cuisine && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {recipe.cuisine}
                        </Badge>
                      )}
                      {recipe.servings && (
                        <span className="text-xs text-muted-foreground">
                          {recipe.servings} servings
                        </span>
                      )}
                    </div>
                  </div>
                  {adding === recipe.id ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
