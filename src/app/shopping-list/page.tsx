"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, RefreshCw, ListChecks } from "lucide-react";
import { toast } from "sonner";
import ShoppingListView from "@/components/shopping-list/ShoppingListView";
import type { ShoppingList, ShoppingListItem, MealPlan } from "@/lib/types";

type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] };

export default function ShoppingListPage() {
  const [list, setList] = useState<ShoppingListWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping-list");
      if (!res.ok) throw new Error("Failed to fetch shopping list");
      const data = await res.json();
      setList(data);
    } catch {
      // No list yet is fine
      setList(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      // Fetch the most recent meal plan
      const plansRes = await fetch("/api/meal-plan");
      if (!plansRes.ok) throw new Error("Failed to fetch meal plans");
      const plans: MealPlan[] = await plansRes.json();

      if (!plans || plans.length === 0) {
        toast.error("No meal plan found. Create a meal plan first.");
        return;
      }

      const currentPlan = plans[0];

      // Generate shopping list from the most recent meal plan
      const res = await fetch("/api/shopping-list/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPlanId: currentPlan.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate shopping list");
      }

      const newList = await res.json();
      setList(newList);
      toast.success("Shopping list generated successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate shopping list";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleItemUpdate(
    id: string,
    updates: { is_checked?: boolean; is_owned?: boolean }
  ) {
    try {
      const res = await fetch("/api/shopping-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) throw new Error("Failed to update item");

      const updatedItem: ShoppingListItem = await res.json();

      // Update local state
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          ),
        };
      });
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleItemAdd(newItem: {
    ingredient_name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: string | null;
  }) {
    if (!list) return;

    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopping_list_id: list.id,
          ...newItem,
        }),
      });

      if (!res.ok) throw new Error("Failed to add item");

      const addedItem: ShoppingListItem = await res.json();

      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [...prev.items, addedItem],
        };
      });

      toast.success("Item added to shopping list");
    } catch {
      toast.error("Failed to add item");
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Shopping List</h1>
        <p className="text-muted-foreground mb-6">
          Your auto-generated shopping list from the meal plan
        </p>
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Shopping List</h1>
          <p className="text-muted-foreground">
            Your auto-generated shopping list from the meal plan
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ListChecks className="h-4 w-4 mr-1" />
              Generate from Meal Plan
            </>
          )}
        </Button>
      </div>

      {list && list.items && list.items.length > 0 ? (
        <ShoppingListView
          list={list}
          onItemUpdate={handleItemUpdate}
          onItemAdd={handleItemAdd}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No shopping list yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a shopping list from your current meal plan to get
              started.
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ListChecks className="h-4 w-4 mr-1" />
                  Generate from Meal Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
