'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PantryItemForm } from '@/components/pantry/PantryItemForm';
import { PantryList } from '@/components/pantry/PantryList';
import { PantryBatchImport } from '@/components/pantry/PantryBatchImport';
import type { PantryItem, PantryLocation } from '@/lib/types';

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | undefined>(undefined);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/pantry');
      if (!res.ok) throw new Error('Failed to fetch pantry items');
      const data: PantryItem[] = await res.json();
      setItems(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load pantry items');
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function filterByLocation(location: PantryLocation): PantryItem[] {
    return items.filter((item) => item.location === location);
  }

  function handleEdit(item: PantryItem) {
    setEditingItem(item);
    setDialogOpen(true);
  }

  function handleAddNew() {
    setEditingItem(undefined);
    setDialogOpen(true);
  }

  async function handleSave(item: PantryItem) {
    try {
      if (editingItem) {
        const res = await fetch('/api/pantry', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, id: editingItem.id }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update item');
        }
        const updated: PantryItem = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        );
        toast.success(`Updated "${updated.name}"`);
      } else {
        const res = await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to add item');
        }
        const created: PantryItem = await res.json();
        setItems((prev) => [...prev, created]);
        toast.success(`Added "${created.name}"`);
      }
      setDialogOpen(false);
      setEditingItem(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save item');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/pantry?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete item');
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Item deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete item');
    }
  }

  async function handleAddToShoppingList(item: PantryItem) {
    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create_list: true,
          ingredient_name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || null,
          category: item.category || "other",
          notes: `Restock (${item.location})`,
        }),
      });

      if (!res.ok) throw new Error("Failed to add to shopping list");

      toast.success(`"${item.name}" added to shopping list`);
    } catch {
      toast.error("Failed to add to shopping list");
    }
  }

  function handleCancel() {
    setDialogOpen(false);
    setEditingItem(undefined);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Pantry Tracker</h1>
          <p className="text-muted-foreground">
            Track items in your pantry, fridge, and freezer
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="size-4 mr-1" />
            Import
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="size-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pantry">
        <TabsList>
          <TabsTrigger value="pantry">Pantry</TabsTrigger>
          <TabsTrigger value="fridge">Fridge</TabsTrigger>
          <TabsTrigger value="freezer">Freezer</TabsTrigger>
        </TabsList>

        <TabsContent value="pantry">
          <PantryList
            items={filterByLocation('pantry')}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddToShoppingList={handleAddToShoppingList}
          />
        </TabsContent>

        <TabsContent value="fridge">
          <PantryList
            items={filterByLocation('fridge')}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddToShoppingList={handleAddToShoppingList}
          />
        </TabsContent>

        <TabsContent value="freezer">
          <PantryList
            items={filterByLocation('freezer')}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddToShoppingList={handleAddToShoppingList}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add Pantry Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the details for this pantry item.'
                : 'Add a new item to your pantry, fridge, or freezer.'}
            </DialogDescription>
          </DialogHeader>
          <PantryItemForm
            onSave={handleSave}
            onCancel={handleCancel}
            initialData={editingItem}
          />
        </DialogContent>
      </Dialog>

      <PantryBatchImport
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchItems}
      />
    </div>
  );
}
