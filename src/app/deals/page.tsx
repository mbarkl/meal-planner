"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tag,
  CreditCard,
  TrendingDown,
  Store,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Deal } from "@/lib/types";
import { CATEGORY_DISPLAY } from "@/lib/constants";

const ALL_CATEGORIES = "all";
const CATEGORIES = Object.keys(CATEGORY_DISPLAY);

export default function SaleItemsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [itemName, setItemName] = useState("");
  const [store, setStore] = useState<string>("frys");
  const [category, setCategory] = useState<string>("produce");
  const [salePrice, setSalePrice] = useState("");
  const [regularPrice, setRegularPrice] = useState("");

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      if (!res.ok) throw new Error("Failed to fetch deals");
      const data: Deal[] = await res.json();
      setDeals(data);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || !salePrice) return;

    setSubmitting(true);
    try {
      // Calculate current week (Wednesday-based)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
      const lastWednesday = new Date(now);
      lastWednesday.setDate(now.getDate() - daysToWed);
      const nextTuesday = new Date(lastWednesday);
      nextTuesday.setDate(lastWednesday.getDate() + 6);

      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: itemName.trim(),
          store,
          category,
          sale_price: parseFloat(salePrice),
          regular_price: regularPrice ? parseFloat(regularPrice) : null,
          week_start: lastWednesday.toISOString().split("T")[0],
          week_end: nextTuesday.toISOString().split("T")[0],
        }),
      });

      if (!res.ok) throw new Error("Failed to add item");

      toast.success(`Added "${itemName.trim()}"`);
      setItemName("");
      setSalePrice("");
      setRegularPrice("");
      fetchDeals();
    } catch {
      toast.error("Failed to add sale item");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/deals?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeals((prev) => prev.filter((d) => d.id !== id));
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  }

  // Derive categories from actual deals
  const dealCategories = Array.from(new Set(deals.map((d) => d.category))).sort();

  const filteredDeals =
    selectedCategory === ALL_CATEGORIES
      ? deals
      : deals.filter((d) => d.category === selectedCategory);

  const frysDeals = filteredDeals.filter((d) => d.store === "frys");
  const safewayDeals = filteredDeals.filter((d) => d.store === "safeway");

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Sale Items</h1>
        <p className="text-muted-foreground mb-6">Add this week&apos;s deals manually</p>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Sale Items</h1>
      <p className="text-muted-foreground mb-6">Add this week&apos;s deals manually</p>

      {/* Add Sale Item Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5" />
            Add Sale Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                placeholder="e.g. Chicken Breast"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="store">Store</Label>
              <Select value={store} onValueChange={(v) => v && setStore(v)}>
                <SelectTrigger id="store">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frys">Fry&apos;s</SelectItem>
                  <SelectItem value="safeway">Safeway</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_DISPLAY[cat]?.label || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sale-price">Sale Price</Label>
              <Input
                id="sale-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="$0.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col">
              <Label htmlFor="reg-price">Regular Price</Label>
              <div className="flex gap-2">
                <Input
                  id="reg-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(e.target.value)}
                />
                <Button type="submit" disabled={submitting} className="shrink-0">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {deals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Tag className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No sale items yet</p>
            <p className="text-sm text-muted-foreground">
              Add sale items above to get started with meal planning around deals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span>
                Fry&apos;s: <span className="font-semibold">{frysDeals.length}</span> deals
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span>
                Safeway: <span className="font-semibold">{safewayDeals.length}</span> deals
              </span>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={selectedCategory === ALL_CATEGORIES ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(ALL_CATEGORIES)}
            >
              All
            </Button>
            {dealCategories.map((cat) => {
              const display = CATEGORY_DISPLAY[cat];
              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {display?.label || cat}
                </Button>
              );
            })}
          </div>

          {/* Two-column comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StoreColumn storeName="Fry's" deals={frysDeals} onDelete={handleDelete} />
            <StoreColumn storeName="Safeway" deals={safewayDeals} onDelete={handleDelete} />
          </div>
        </div>
      )}
    </div>
  );
}

function StoreColumn({
  storeName,
  deals,
  onDelete,
}: {
  storeName: string;
  deals: Deal[];
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Store className="h-5 w-5" />
        {storeName}
        <span className="text-sm font-normal text-muted-foreground">
          ({deals.length})
        </span>
      </h2>
      {deals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No deals in this category
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function DealCard({ deal, onDelete }: { deal: Deal; onDelete: (id: string) => void }) {
  const display = CATEGORY_DISPLAY[deal.category];

  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{deal.item_name}</p>
            {deal.quantity_description && (
              <p className="text-xs text-muted-foreground">
                {deal.quantity_description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-green-600">
                ${deal.sale_price.toFixed(2)}
              </span>
              {deal.regular_price && (
                <span className="text-xs text-muted-foreground line-through">
                  ${deal.regular_price.toFixed(2)}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(deal.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {deal.deal_type && deal.deal_type !== 'sale' && (
            <Badge variant="outline">
              <Tag className="h-3 w-3 mr-0.5" />
              {deal.deal_type}
            </Badge>
          )}
          {deal.requires_card && (
            <Badge variant="secondary">
              <CreditCard className="h-3 w-3 mr-0.5" />
              Card Required
            </Badge>
          )}
          {display && (
            <Badge variant="outline">
              {display.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
