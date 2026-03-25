"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { WeeklyCalendar } from "@/components/meal-plan/WeeklyCalendar";
import { MealPlanGenerator } from "@/components/meal-plan/MealPlanGenerator";
import { AddMealDialog } from "@/components/meal-plan/AddMealDialog";
import type { MealPlan, MealPlanEntry, StoreName, DayOfWeek, MealType } from "@/lib/types";

function getCurrentMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  return monday.toISOString().split("T")[0];
}

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  return monday.toISOString().split("T")[0];
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
};

export default function MealPlanPage() {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Add meal dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDay, setAddDay] = useState<DayOfWeek | null>(null);
  const [addMealType, setAddMealType] = useState<MealType | null>(null);

  const fetchCurrentWeekPlan = useCallback(async () => {
    try {
      const currentMonday = getCurrentMonday();
      const response = await fetch(`/api/meal-plan?weekStart=${currentMonday}`);
      if (!response.ok) throw new Error("Failed to fetch meal plan");
      const data: MealPlan[] = await response.json();

      if (data.length > 0) {
        setMealPlan(data[0]);
      } else {
        const nextMonday = getNextMonday();
        if (nextMonday !== currentMonday) {
          const resp2 = await fetch(`/api/meal-plan?weekStart=${nextMonday}`);
          if (resp2.ok) {
            const data2: MealPlan[] = await resp2.json();
            if (data2.length > 0) {
              setMealPlan(data2[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentWeekPlan();
  }, [fetchCurrentWeekPlan]);

  // Ensure a meal plan exists for the current week, creating one if needed
  async function ensureMealPlan(): Promise<string> {
    if (mealPlan) return mealPlan.id;

    // Create a new empty meal plan for the current week
    const weekStart = getCurrentMonday();
    const res = await fetch("/api/meal-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // PUT expects an id — we need to create via a different method
        // Actually, there's no POST on meal-plan route. Let me use the entries approach:
        // We'll create the plan directly via Supabase through a simple POST
      }),
    });

    // The meal-plan API doesn't have a POST for creating empty plans.
    // Let's create one via the generate endpoint workaround, or add one.
    // For now, let's POST to a new endpoint.
    const createRes = await fetch("/api/meal-plan/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart }),
    });

    if (!createRes.ok) {
      throw new Error("Failed to create meal plan");
    }

    const newPlan: MealPlan = await createRes.json();
    setMealPlan(newPlan);
    return newPlan.id;
  }

  async function handleGenerate(
    weekStart: string,
    numMeals: number,
    numPeople: number,
    storePreference: StoreName | null
  ) {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, numMeals, numPeople, storePreference }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate meal plan");
      }

      const data: MealPlan = await response.json();
      setMealPlan(data);
      toast.success("Meal plan generated successfully!");
    } catch (error) {
      console.error("Error generating meal plan:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate meal plan");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAddMealClick(day: DayOfWeek, mealType: MealType) {
    setAddDay(day);
    setAddMealType(mealType);
    setAddDialogOpen(true);
  }

  async function handleAddMeal(recipeId: string | null, customName: string | null) {
    try {
      const planId = await ensureMealPlan();

      const res = await fetch("/api/meal-plan/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_plan_id: planId,
          day: addDay,
          meal_type: addMealType,
          recipe_id: recipeId,
          custom_meal_name: customName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add meal");
      }

      const newEntry: MealPlanEntry = await res.json();

      // Update the local meal plan with the new entry
      setMealPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: [...(prev.entries || []), newEntry],
        };
      });

      const name = customName || newEntry.recipe?.title || "Meal";
      toast.success(`Added "${name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add meal");
      throw error;
    }
  }

  async function handleRemoveEntry(entryId: string) {
    try {
      const res = await fetch(`/api/meal-plan/entries?id=${entryId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove meal");

      setMealPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: (prev.entries || []).filter((e) => e.id !== entryId),
        };
      });

      toast.success("Meal removed");
    } catch {
      toast.error("Failed to remove meal");
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!mealPlan) return;
    try {
      const response = await fetch("/api/meal-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mealPlan.id, status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      setMealPlan((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success(`Meal plan marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update meal plan status");
    }
  }

  const statusConfig = mealPlan
    ? STATUS_LABELS[mealPlan.status] || STATUS_LABELS.draft
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Meal Planner</h1>
      <p className="text-muted-foreground mb-6">
        Plan your weekly meals — click any empty slot to add a recipe from your cookbook
      </p>

      {/* Generator controls */}
      <MealPlanGenerator onGenerate={handleGenerate} isLoading={isGenerating} />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Meal plan display */}
      {!isLoading && mealPlan && (
        <div className="mt-6 space-y-4">
          {/* Header with status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">
                  Week of {mealPlan.week_start}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mealPlan.num_meals} meals for {mealPlan.num_people}{" "}
                  {mealPlan.num_people === 1 ? "person" : "people"}
                  {mealPlan.store_preference &&
                    ` - ${mealPlan.store_preference === "frys" ? "Fry's" : "Safeway"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusConfig && (
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              )}
              {mealPlan.status === "draft" && (
                <button
                  onClick={() => handleStatusChange("active")}
                  className="text-xs text-primary hover:underline"
                >
                  Activate
                </button>
              )}
              {mealPlan.status === "active" && (
                <button
                  onClick={() => handleStatusChange("completed")}
                  className="text-xs text-primary hover:underline"
                >
                  Complete
                </button>
              )}
            </div>
          </div>

          {/* Weekly calendar */}
          <WeeklyCalendar
            entries={(mealPlan.entries as MealPlanEntry[]) || []}
            onAddMeal={handleAddMealClick}
            onRemoveEntry={handleRemoveEntry}
          />
        </div>
      )}

      {/* Empty state — show calendar with add buttons */}
      {!isLoading && !mealPlan && !isGenerating && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">
                Week of {getCurrentMonday()}
              </h2>
              <p className="text-xs text-muted-foreground">
                Click any slot to add a meal from your recipes
              </p>
            </div>
          </div>
          <WeeklyCalendar
            entries={[]}
            onAddMeal={handleAddMealClick}
          />
        </div>
      )}

      {/* Add meal dialog */}
      <AddMealDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        day={addDay}
        mealType={addMealType}
        onAdd={handleAddMeal}
      />
    </div>
  );
}
