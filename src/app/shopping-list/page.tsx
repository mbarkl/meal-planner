"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, RefreshCw, ListChecks, Plus, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ShoppingListView from "@/components/shopping-list/ShoppingListView";
import type { ShoppingList, ShoppingListItem, MealPlan } from "@/lib/types";

type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] };

export default function ShoppingListPage() {
  const [list, setList] = useState<ShoppingListWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemStore, setNewItemStore] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping-list");
      if (!res.ok) throw new Error("Failed to fetch shopping list");
      const data = await res.json();
      setList(data);
    } catch {
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
      const plansRes = await fetch("/api/meal-plan");
      if (!plansRes.ok) throw new Error("Failed to fetch meal plans");
      const plans: MealPlan[] = await plansRes.json();

      if (!plans || plans.length === 0) {
        toast.error("No meal plan found. Create a meal plan first.");
        return;
      }

      const currentPlan = plans[0];

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
    store?: string | null;
    estimated_price?: number | null;
    notes?: string | null;
  }) {
    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopping_list_id: list?.id || undefined,
          create_list: !list,
          ...newItem,
        }),
      });

      if (!res.ok) throw new Error("Failed to add item");

      const addedItem = await res.json();

      if (!list) {
        // A new list was created — refetch to get the full structure
        await fetchList();
      } else {
        setList((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: [...prev.items, addedItem],
          };
        });
      }

      toast.success("Item added to shopping list");
    } catch {
      toast.error("Failed to add item");
    }
  }

  async function handleAddFirstItem() {
    if (!newItemName.trim()) return;
    setAddingItem(true);
    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create_list: true,
          ingredient_name: newItemName.trim(),
          quantity: newItemQty ? parseFloat(newItemQty) : null,
          unit: newItemUnit || null,
          store: newItemStore.trim() || null,
          estimated_price: newItemPrice ? parseFloat(newItemPrice) : null,
          notes: newItemNotes.trim() || null,
          category: "other",
        }),
      });

      if (!res.ok) throw new Error("Failed to create list");

      await fetchList();
      toast.success("Shopping list created!");
      setAddDialogOpen(false);
      setNewItemName("");
      setNewItemStore("");
      setNewItemQty("");
      setNewItemUnit("");
      setNewItemPrice("");
      setNewItemNotes("");
    } catch {
      toast.error("Failed to create shopping list");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleMoveToPantry(item: ShoppingListItem) {
    try {
      // Add to pantry
      const pantryRes = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.ingredient_name,
          quantity: item.quantity || 1,
          unit: item.unit || "count",
          location: "pantry",
          purchase_date: new Date().toISOString().split("T")[0],
          purchased_from: item.store || null,
          is_staple: true,
        }),
      });

      if (!pantryRes.ok) throw new Error("Failed to add to pantry");

      // Remove from shopping list
      const delRes = await fetch(`/api/shopping-list?id=${item.id}`, {
        method: "DELETE",
      });

      if (!delRes.ok) throw new Error("Failed to remove from list");

      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((i) => i.id !== item.id),
        };
      });

      toast.success(`"${item.ingredient_name}" moved to pantry`);
    } catch {
      toast.error("Failed to move item to pantry");
    }
  }

  async function handleClearAll() {
    if (!list) return;
    const res = await fetch(
      `/api/shopping-list?clear_all=true&list_id=${list.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to clear list");
    setList((prev) => (prev ? { ...prev, items: [] } : prev));
  }

  async function handleItemDelete(id: string) {
    try {
      const res = await fetch(`/api/shopping-list?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");

      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
        };
      });
    } catch {
      toast.error("Failed to delete item");
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Shopping List</h1>
        <p className="text-muted-foreground mb-6">
          Your shopping list
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
            Your shopping list
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} variant="outline">
          {generating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ListChecks className="h-4 w-4 mr-1" />
              From Meal Plan
            </>
          )}
        </Button>
      </div>

      {list && list.items && list.items.length > 0 ? (
        <ShoppingListView
          list={list}
          onItemUpdate={handleItemUpdate}
          onItemAdd={handleItemAdd}
          onItemDelete={handleItemDelete}
          onMoveToPantry={handleMoveToPantry}
          onClearAll={handleClearAll}
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">No shopping list yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add items manually or generate from your meal plan.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Item
                </Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ListChecks className="h-4 w-4 mr-1" />
                      From Meal Plan
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add First Item Dialog (when no list exists yet) */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Item</DialogTitle>
                <DialogDescription>
                  Add your first item to start a new shopping list.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label htmlFor="first-item-name" className="text-sm font-medium mb-1 block">
                    Item Name
                  </label>
                  <Input
                    id="first-item-name"
                    placeholder="e.g. Chicken Breast"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newItemName.trim()) handleAddFirstItem();
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="first-item-store" className="text-sm font-medium mb-1 block">
                    Store
                  </label>
                  <Input
                    id="first-item-store"
                    placeholder="e.g. Fry's, Costco, Trader Joe's"
                    value={newItemStore}
                    onChange={(e) => setNewItemStore(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="first-item-qty" className="text-sm font-medium mb-1 block">
                      Quantity
                    </label>
                    <Input
                      id="first-item-qty"
                      type="number"
                      placeholder="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="first-item-unit" className="text-sm font-medium mb-1 block">
                      Unit
                    </label>
                    <Input
                      id="first-item-unit"
                      placeholder="e.g. lb, oz"
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="first-item-price" className="text-sm font-medium mb-1 block">
                      Price
                    </label>
                    <Input
                      id="first-item-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="$0.00"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="first-item-notes" className="text-sm font-medium mb-1 block">
                    Notes
                  </label>
                  <Input
                    id="first-item-notes"
                    placeholder="e.g. Get the organic brand"
                    value={newItemNotes}
                    onChange={(e) => setNewItemNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  onClick={handleAddFirstItem}
                  disabled={!newItemName.trim() || addingItem}
                >
                  {addingItem ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
