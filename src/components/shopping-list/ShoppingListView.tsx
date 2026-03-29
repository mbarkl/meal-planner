"use client";

import { useState, useMemo } from "react";
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
  Store,
  Trash2,
  LayoutGrid,
  Package,
  Merge,
  X,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AISLE_ORDER, CATEGORY_DISPLAY } from "@/lib/constants";
import type { ShoppingList, ShoppingListItem } from "@/lib/types";

type GroupMode = "category" | "store";

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
    store?: string | null;
    estimated_price?: number | null;
    notes?: string | null;
  }) => Promise<void>;
  onItemDelete?: (id: string) => Promise<void>;
  onMoveToPantry?: (item: ShoppingListItem) => Promise<void>;
  onClearAll?: () => Promise<void>;
  onMergeItems?: (keepId: string, deleteIds: string[], mergedName: string, mergedQty: number | null, mergedUnit: string | null) => Promise<void>;
}

export default function ShoppingListView({
  list,
  onItemUpdate,
  onItemAdd,
  onItemDelete,
  onMoveToPantry,
  onClearAll,
  onMergeItems,
}: ShoppingListViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [groupMode, setGroupMode] = useState<GroupMode>("category");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Merge mode state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeChosenName, setMergeChosenName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemStore, setNewItemStore] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  const items = list.items || [];

  // Get unique store names for the store suggestions
  const knownStores = useMemo(() => {
    const stores = new Set<string>();
    items.forEach((item) => {
      if (item.store) stores.add(item.store);
    });
    return Array.from(stores).sort();
  }, [items]);

  // Group items by category (aisle order)
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    for (const category of AISLE_ORDER) {
      const categoryItems = items.filter(
        (item) => (item.category || "other") === category
      );
      if (categoryItems.length > 0) {
        groups[category] = categoryItems.sort((a, b) => {
          if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
          if (a.is_owned !== b.is_owned) return a.is_owned ? 1 : -1;
          return a.ingredient_name.localeCompare(b.ingredient_name);
        });
      }
    }
    return groups;
  }, [items]);

  // Group items by store
  const groupedByStore = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    const sortedItems = [...items].sort((a, b) => {
      if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
      if (a.is_owned !== b.is_owned) return a.is_owned ? 1 : -1;
      return a.ingredient_name.localeCompare(b.ingredient_name);
    });

    for (const item of sortedItems) {
      const storeName = item.store || "No Store";
      if (!groups[storeName]) {
        groups[storeName] = [];
      }
      groups[storeName].push(item);
    }

    // Sort groups: named stores alphabetically, "No Store" at end
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      if (a === "No Store") return 1;
      if (b === "No Store") return -1;
      return a.localeCompare(b);
    });

    return Object.fromEntries(sortedEntries);
  }, [items]);

  const activeGroups = groupMode === "category" ? groupedByCategory : groupedByStore;

  // Calculate estimated total
  const estimatedTotal = items.reduce((sum, item) => {
    if (item.estimated_price && !item.is_owned) {
      return sum + item.estimated_price;
    }
    return sum;
  }, 0);

  const checkedCount = items.filter((item) => item.is_checked).length;
  const totalCount = items.length;

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function getGroupLabel(key: string): string {
    if (groupMode === "category") {
      return CATEGORY_DISPLAY[key]?.label || key;
    }
    return key;
  }

  function toggleMergeMode() {
    setMergeMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelectItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Compute merge preview from selected items
  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  // Combined quantity: sum if all units match, otherwise null (can't combine)
  const mergePreview = useMemo(() => {
    if (selectedItems.length < 2) return null;
    const units = new Set(selectedItems.map((i) => i.unit ?? ""));
    const allSameUnit = units.size === 1;
    const combinedQty = allSameUnit
      ? selectedItems.reduce((sum, i) => sum + (i.quantity ?? 0), 0)
      : null;
    const unit = allSameUnit ? (selectedItems[0].unit ?? null) : null;
    return { combinedQty, unit };
  }, [selectedItems]);

  async function handleConfirmMerge() {
    if (!onMergeItems || selectedItems.length < 2 || !mergeChosenName) return;
    setMerging(true);
    try {
      const [keep, ...rest] = selectedItems;
      await onMergeItems(
        keep.id,
        rest.map((i) => i.id),
        mergeChosenName,
        mergePreview?.combinedQty ?? null,
        mergePreview?.unit ?? null
      );
      setMergeDialogOpen(false);
      setSelectedIds(new Set());
      setMergeMode(false);
      toast.success("Items merged");
    } catch {
      toast.error("Failed to merge items");
    } finally {
      setMerging(false);
    }
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
        store: newItemStore.trim() || null,
        estimated_price: newItemPrice ? parseFloat(newItemPrice) : null,
        notes: newItemNotes.trim() || null,
      });
      setNewItemName("");
      setNewItemQuantity("");
      setNewItemUnit("");
      setNewItemStore("");
      setNewItemPrice("");
      setNewItemNotes("");
      setDialogOpen(false);
    } finally {
      setAddingItem(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress, group toggle, and add button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingCart className="h-4 w-4" />
          <span>
            {checkedCount} of {totalCount} items checked
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={groupMode === "category" ? "default" : "outline"}
            size="sm"
            onClick={() => { setGroupMode("category"); setCollapsedGroups(new Set()); }}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
            By Aisle
          </Button>
          <Button
            variant={groupMode === "store" ? "default" : "outline"}
            size="sm"
            onClick={() => { setGroupMode("store"); setCollapsedGroups(new Set()); }}
          >
            <Store className="h-3.5 w-3.5 mr-1" />
            By Store
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
          {onMergeItems && items.length > 1 && (
            <Button
              variant={mergeMode ? "default" : "outline"}
              size="sm"
              onClick={toggleMergeMode}
            >
              {mergeMode ? (
                <><X className="h-3.5 w-3.5 mr-1" />Cancel</>
              ) : (
                <><Merge className="h-3.5 w-3.5 mr-1" />Merge</>
              )}
            </Button>
          )}
          {onClearAll && items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setClearConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Grouped items */}
      {Object.entries(activeGroups).map(([groupKey, groupItems]) => {
        const isCollapsed = collapsedGroups.has(groupKey);

        return (
          <Card key={groupKey}>
            <button
              className="flex w-full items-center gap-2 px-4 pt-4 pb-2 text-left"
              onClick={() => toggleGroup(groupKey)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              {groupMode === "store" && (
                <Store className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">{getGroupLabel(groupKey)}</span>
              <span className="text-xs text-muted-foreground">
                ({groupItems.length})
              </span>
            </button>

            {!isCollapsed && (
              <CardContent className="pt-0 pb-2">
                <ul className="space-y-1">
                  {groupItems.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                        item.is_owned ? "opacity-50" : ""
                      } ${mergeMode ? "cursor-pointer hover:bg-muted/50" : ""} ${
                        mergeMode && selectedIds.has(item.id) ? "bg-primary/10 ring-1 ring-primary/30 rounded-md" : ""
                      }`}
                      onClick={mergeMode ? () => toggleSelectItem(item.id) : undefined}
                    >
                      {mergeMode ? (
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <Checkbox
                          checked={item.is_checked}
                          onCheckedChange={(checked: boolean) =>
                            onItemUpdate(item.id, { is_checked: checked })
                          }
                        />
                      )}
                      <div className="flex flex-1 items-center gap-2 min-w-0 flex-wrap">
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
                        {/* Show store badge when grouped by category */}
                        {groupMode === "category" && item.store && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5">
                            {item.store}
                          </Badge>
                        )}
                        {item.notes && (
                          <span className="text-xs text-muted-foreground italic">
                            {item.notes}
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
                            Have
                          </span>
                        )}
                        {!mergeMode && onMoveToPantry && item.is_checked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-orange-600"
                            onClick={() => onMoveToPantry(item)}
                            title="Move to Pantry"
                          >
                            <Package className="h-3 w-3" />
                          </Button>
                        )}
                        {!mergeMode && onItemDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => onItemDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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

      {/* Merge mode sticky action bar */}
      {mergeMode && (
        <div className="sticky bottom-4 z-10">
          <div className="mx-auto max-w-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size === 0
                  ? "Tap items to select"
                  : `${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""} selected`}
              </span>
              <Button
                size="sm"
                disabled={selectedIds.size < 2}
                onClick={() => {
                  setMergeChosenName(selectedItems[0]?.ingredient_name ?? "");
                  setMergeDialogOpen(true);
                }}
              >
                <Merge className="h-3.5 w-3.5 mr-1" />
                Merge {selectedIds.size >= 2 ? selectedIds.size : ""}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {Object.keys(activeGroups).length === 0 && (
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
              Add an item to your shopping list.
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
            <div>
              <label
                htmlFor="add-item-store"
                className="text-sm font-medium mb-1 block"
              >
                Store
              </label>
              <Input
                id="add-item-store"
                placeholder="e.g. Fry's, Costco, Trader Joe's"
                value={newItemStore}
                onChange={(e) => setNewItemStore(e.target.value)}
                list="store-suggestions"
              />
              {knownStores.length > 0 && (
                <datalist id="store-suggestions">
                  {knownStores.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
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
              <div className="flex-1">
                <label
                  htmlFor="add-item-price"
                  className="text-sm font-medium mb-1 block"
                >
                  Price
                </label>
                <Input
                  id="add-item-price"
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
              <label
                htmlFor="add-item-notes"
                className="text-sm font-medium mb-1 block"
              >
                Notes
              </label>
              <Input
                id="add-item-notes"
                placeholder="e.g. Get the organic brand"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
              />
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

      {/* Merge Items Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Items</DialogTitle>
            <DialogDescription>
              Choose a name for the merged item. Quantities will be combined.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name picker */}
            <div>
              <p className="text-sm font-medium mb-2">Item name</p>
              <RadioGroup
                value={mergeChosenName}
                onValueChange={setMergeChosenName}
                className="space-y-2"
              >
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <RadioGroupItem value={item.ingredient_name} id={`merge-name-${item.id}`} />
                    <Label htmlFor={`merge-name-${item.id}`} className="font-normal cursor-pointer">
                      {item.ingredient_name}
                      {item.quantity != null && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({item.quantity}{item.unit ? ` ${item.unit}` : ""})
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Combined quantity preview */}
            <div className="rounded-lg bg-muted px-4 py-3 text-sm">
              <span className="font-medium">Combined total: </span>
              {mergePreview?.combinedQty != null ? (
                <span>
                  {mergePreview.combinedQty}
                  {mergePreview.unit ? ` ${mergePreview.unit}` : ""}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {selectedItems.every((i) => i.quantity == null)
                    ? "No quantities to combine"
                    : "Units differ — quantities listed separately"}
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              disabled={!mergeChosenName || merging}
              onClick={handleConfirmMerge}
            >
              {merging ? "Merging..." : "Merge Items"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear Shopping List?</DialogTitle>
            <DialogDescription>
              This will remove all {items.length} item{items.length !== 1 ? "s" : ""} from your shopping list. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={clearing}
              onClick={async () => {
                if (!onClearAll) return;
                setClearing(true);
                try {
                  await onClearAll();
                  setClearConfirmOpen(false);
                  toast.success("Shopping list cleared");
                } catch {
                  toast.error("Failed to clear list");
                } finally {
                  setClearing(false);
                }
              }}
            >
              {clearing ? "Clearing..." : "Clear All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
