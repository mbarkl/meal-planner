"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { AISLE_ORDER, CATEGORY_DISPLAY } from "@/lib/constants";
import type { ShoppingList, ShoppingListItem } from "@/lib/types";

interface ShoppingListViewProps {
  list: ShoppingList & { items: ShoppingListItem[] };
  onItemUpdate: (
    id: string,
    updates: { is_checked?: boolean; is_owned?: boolean }
  ) => Promise<void>;
  onItemAdd: (item: {
    ingredient_name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: string | null;
  }) => Promise<void>;
}

export default function ShoppingListView({
  list,
  onItemUpdate,
  onItemAdd,
}: ShoppingListViewProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const items = list.items || [];

  // Group items by category, ordered by AISLE_ORDER
  const groupedItems: Record<string, ShoppingListItem[]> = {};
  for (const category of AISLE_ORDER) {
    const categoryItems = items.filter(
      (item) => (item.category || "other") === category
    );
    if (categoryItems.length > 0) {
      // Sort: non-owned first, then owned items at the bottom
      groupedItems[category] = categoryItems.sort((a, b) => {
        if (a.is_owned !== b.is_owned) return a.is_owned ? 1 : -1;
        return a.sort_order - b.sort_order;
      });
    }
  }

  // Calculate estimated total (only items with prices that aren't already owned)
  const estimatedTotal = items.reduce((sum, item) => {
    if (item.estimated_price && !item.is_owned) {
      return sum + item.estimated_price;
    }
    return sum;
  }, 0);

  const checkedCount = items.filter((item) => item.is_checked).length;
  const totalCount = items.length;

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  async function handleAddItem() {
    if (!newItemName.trim()) return;
    setAddingItem(true);
    try {
      await onItemAdd({
        ingredient_name: newItemName.trim(),
        quantity: newItemQuantity ? parseFloat(newItemQuantity) : null,
        unit: newItemUnit || null,
        category: "other",
      });
      setNewItemName("");
      setNewItemQuantity("");
      setNewItemUnit("");
      setDialogOpen(false);
    } finally {
      setAddingItem(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress and actions header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingCart className="h-4 w-4" />
          <span>
            {checkedCount} of {totalCount} items checked
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {/* Category groups */}
      {Object.entries(groupedItems).map(([category, categoryItems]) => {
        const display = CATEGORY_DISPLAY[category] || {
          label: category,
          icon: "Package",
        };
        const isCollapsed = collapsedCategories.has(category);

        return (
          <Card key={category}>
            <button
              className="flex w-full items-center gap-2 px-4 pt-4 pb-2 text-left"
              onClick={() => toggleCategory(category)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">{display.label}</span>
              <span className="text-xs text-muted-foreground">
                ({categoryItems.length})
              </span>
            </button>

            {!isCollapsed && (
              <CardContent className="pt-0 pb-2">
                <ul className="space-y-1">
                  {categoryItems.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${
                        item.is_owned
                          ? "opacity-50"
                          : ""
                      }`}
                    >
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={(checked: boolean) =>
                          onItemUpdate(item.id, { is_checked: checked })
                        }
                      />
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <span
                          className={`text-sm ${
                            item.is_checked
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {item.ingredient_name}
                        </span>
                        {item.quantity != null && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {item.quantity}
                            {item.unit ? ` ${item.unit}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.estimated_price != null && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          >
                            <DollarSign className="h-3 w-3" />
                            {item.estimated_price.toFixed(2)}
                          </Badge>
                        )}
                        {item.is_owned && (
                          <span className="text-xs text-muted-foreground">
                            Already have
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Estimated total */}
      {estimatedTotal > 0 && (
        <Card>
          <CardFooter className="justify-between">
            <span className="text-sm font-medium">Estimated Total (on-sale items)</span>
            <span className="text-sm font-semibold">
              ${estimatedTotal.toFixed(2)}
            </span>
          </CardFooter>
        </Card>
      )}

      {/* Empty state */}
      {Object.keys(groupedItems).length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No items in this shopping list.
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a custom item to your shopping list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="add-item-name"
                className="text-sm font-medium mb-1 block"
              >
                Item Name
              </label>
              <Input
                id="add-item-name"
                placeholder="e.g. Olive Oil"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                }}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label
                  htmlFor="add-item-qty"
                  className="text-sm font-medium mb-1 block"
                >
                  Quantity
                </label>
                <Input
                  id="add-item-qty"
                  type="number"
                  placeholder="1"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="add-item-unit"
                  className="text-sm font-medium mb-1 block"
                >
                  Unit
                </label>
                <Input
                  id="add-item-unit"
                  placeholder="e.g. lb, oz, count"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleAddItem}
              disabled={!newItemName.trim() || addingItem}
            >
              {addingItem ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
