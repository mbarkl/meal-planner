"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Receipt,
  Plus,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import type { Purchase, StoreName } from "@/lib/types";
import { STORES } from "@/lib/types";

export default function HistoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formStore, setFormStore] = useState<StoreName>("frys");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formTotal, setFormTotal] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error("Failed to fetch purchases");
      const data: Purchase[] = await res.json();
      setPurchases(data);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  function resetForm() {
    setFormStore("frys");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTotal("");
    setFormNotes("");
  }

  async function handleSubmit() {
    if (!formStore || !formDate) {
      toast.error("Please fill in the store and date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: formStore,
          purchase_date: formDate,
          total_amount: formTotal ? parseFloat(formTotal) : null,
          notes: formNotes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create purchase");
      }

      const newPurchase: Purchase = await res.json();
      setPurchases((prev) => [newPurchase, ...prev]);
      toast.success("Purchase logged successfully!");
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to log purchase";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete purchase");
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success("Purchase deleted");
    } catch {
      toast.error("Failed to delete purchase");
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Purchase History</h1>
        <p className="text-muted-foreground mb-6">
          Track your shopping trips and spending
        </p>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Purchase History</h1>
          <p className="text-muted-foreground">
            Track your shopping trips and spending
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
              />
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Log Purchase
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Purchase</DialogTitle>
              <DialogDescription>
                Record a shopping trip.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="store">Store</Label>
                <Select
                  value={formStore}
                  onValueChange={(val) => setFormStore(val as StoreName)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="total">Total Amount ($)</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formTotal}
                  onChange={(e) => setFormTotal(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g. Weekly grocery run"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No purchases yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Log your shopping trips to track spending over time.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Log Purchase
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => {
            const storeLabel =
              STORES.find((s) => s.value === purchase.store)?.label ||
              purchase.store;
            const dateStr = new Date(
              purchase.purchase_date
            ).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <Card key={purchase.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {storeLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateStr}
                          {purchase.notes ? ` \u00b7 ${purchase.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {purchase.total_amount != null && (
                        <span className="text-sm font-semibold">
                          ${purchase.total_amount.toFixed(2)}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(purchase.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
