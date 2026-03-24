"use client";

import { useState } from "react";
import { Clock, Repeat, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { MealPlanEntry, Recipe, DayOfWeek, MealType } from "@/lib/types";
import { DAYS_OF_WEEK, MEAL_TYPES } from "@/lib/types";

interface WeeklyCalendarProps {
  entries: MealPlanEntry[];
  onViewRecipe?: (recipe: Recipe) => void;
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// Only show main meal rows (breakfast, lunch, dinner)
const CALENDAR_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export function WeeklyCalendar({ entries, onViewRecipe }: WeeklyCalendarProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Build a lookup: day -> meal_type -> entries
  const grid: Record<string, Record<string, MealPlanEntry[]>> = {};
  for (const day of DAYS_OF_WEEK) {
    grid[day] = {};
    for (const mt of MEAL_TYPES) {
      grid[day][mt] = [];
    }
  }

  for (const entry of entries) {
    if (grid[entry.day] && grid[entry.day][entry.meal_type]) {
      grid[entry.day][entry.meal_type].push(entry);
    }
  }

  function handleMealClick(entry: MealPlanEntry) {
    if (entry.recipe) {
      setSelectedRecipe(entry.recipe);
      setDialogOpen(true);
      onViewRecipe?.(entry.recipe);
    }
  }

  function getMealTitle(entry: MealPlanEntry): string {
    if (entry.recipe?.title) return entry.recipe.title;
    if (entry.custom_meal_name) return entry.custom_meal_name;
    return "Unnamed meal";
  }

  function getPrepTime(entry: MealPlanEntry): number | null {
    if (!entry.recipe) return null;
    return entry.recipe.prep_time_minutes;
  }

  return (
    <>
      {/* Desktop grid view */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row with day names */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1 mb-1">
            <div />
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {DAY_LABELS[day]}
              </div>
            ))}
          </div>

          {/* Meal type rows */}
          {CALENDAR_MEAL_TYPES.map((mealType) => (
            <div
              key={mealType}
              className="grid grid-cols-[100px_repeat(7,1fr)] gap-1 mb-1"
            >
              <div className="flex items-center text-sm font-medium text-muted-foreground px-2">
                {MEAL_TYPE_LABELS[mealType]}
              </div>
              {DAYS_OF_WEEK.map((day) => {
                const cellEntries = grid[day][mealType];
                return (
                  <div key={`${day}-${mealType}`} className="min-h-[80px]">
                    {cellEntries.length > 0 ? (
                      cellEntries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => handleMealClick(entry)}
                          className="w-full text-left p-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer h-full"
                        >
                          <div className="flex items-start gap-1">
                            <span className="text-xs font-medium leading-tight line-clamp-2 flex-1">
                              {getMealTitle(entry)}
                            </span>
                            {entry.is_leftover && (
                              <Repeat className="size-3 text-amber-500 shrink-0 mt-0.5" />
                            )}
                          </div>
                          {getPrepTime(entry) && (
                            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                              <Clock className="size-3" />
                              <span className="text-[10px]">
                                {getPrepTime(entry)}m
                              </span>
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="w-full h-full min-h-[80px] rounded-lg border border-dashed border-border/50 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/50">
                          --
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile/tablet list view */}
      <div className="lg:hidden space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const dayEntries = entries.filter((e) => e.day === day);
          if (dayEntries.length === 0) return null;
          return (
            <div key={day}>
              <h3 className="text-sm font-semibold mb-2 capitalize">
                {day}
              </h3>
              <div className="space-y-1.5">
                {dayEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleMealClick(entry)}
                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {MEAL_TYPE_LABELS[entry.meal_type]}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {getMealTitle(entry)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {entry.is_leftover && (
                          <Repeat className="size-3.5 text-amber-500" />
                        )}
                        {getPrepTime(entry) && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {getPrepTime(entry)}m
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.title || "Recipe Details"}</DialogTitle>
            {selectedRecipe?.description && (
              <DialogDescription>{selectedRecipe.description}</DialogDescription>
            )}
          </DialogHeader>

          {selectedRecipe && (
            <div className="space-y-4">
              {/* Meta info */}
              <div className="flex flex-wrap gap-2">
                {selectedRecipe.prep_time_minutes && (
                  <Badge variant="outline">
                    Prep: {selectedRecipe.prep_time_minutes}m
                  </Badge>
                )}
                {selectedRecipe.cook_time_minutes && (
                  <Badge variant="outline">
                    Cook: {selectedRecipe.cook_time_minutes}m
                  </Badge>
                )}
                <Badge variant="outline">
                  Serves {selectedRecipe.servings}
                </Badge>
                {selectedRecipe.tags?.includes("leftover") && (
                  <Badge variant="secondary">
                    <Repeat className="size-3 mr-1" />
                    Leftover
                  </Badge>
                )}
              </div>

              {/* Ingredients */}
              {selectedRecipe.ingredients &&
                selectedRecipe.ingredients.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <UtensilsCrossed className="size-4" />
                      Ingredients
                    </h4>
                    <ul className="space-y-1">
                      {selectedRecipe.ingredients.map((ing) => (
                        <li
                          key={ing.id}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-foreground/30 mt-1.5 size-1.5 rounded-full bg-current shrink-0" />
                          <span>
                            {ing.quantity != null && `${ing.quantity} `}
                            {ing.unit && `${ing.unit} `}
                            {ing.ingredient_name}
                            {ing.preparation && (
                              <span className="text-muted-foreground/70">
                                , {ing.preparation}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Directions */}
              {selectedRecipe.directions &&
                selectedRecipe.directions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Directions</h4>
                    <ol className="space-y-2">
                      {selectedRecipe.directions.map((dir) => (
                        <li
                          key={dir.step}
                          className="text-sm flex gap-3"
                        >
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full size-5 flex items-center justify-center shrink-0 mt-0.5">
                            {dir.step}
                          </span>
                          <span className="text-muted-foreground">
                            {dir.text}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
