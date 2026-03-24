'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays, ShoppingCart, Package, Tag,
  AlertTriangle, ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DashboardData {
  shoppingListItems: number;
  pantryExpiring: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    shoppingListItems: 0,
    pantryExpiring: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [pantryRes, listRes] = await Promise.allSettled([
        fetch('/api/pantry').then((r) => r.ok ? r.json() : []),
        fetch('/api/shopping-list').then((r) => r.ok ? r.json() : null),
      ]);

      const pantry = pantryRes.status === 'fulfilled' ? pantryRes.value : [];
      const list = listRes.status === 'fulfilled' ? listRes.value : null;

      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const expiring = Array.isArray(pantry)
        ? pantry.filter((p: { expiration_date?: string }) =>
            p.expiration_date && new Date(p.expiration_date) <= threeDays
          ).length
        : 0;

      setData({
        pantryExpiring: expiring,
        shoppingListItems: list?.items?.filter((i: { is_checked: boolean }) => !i.is_checked)?.length || 0,
      });
    } catch {
      // silently handle errors on dashboard load
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-6">
        Your meal planning command center
      </p>

      {/* Quick stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/meal-plan">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-sm font-medium">Meal Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Plan your weekly meals around sales
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/shopping-list">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <CardTitle className="text-sm font-medium">Shopping List</CardTitle>
              {data.shoppingListItems > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {data.shoppingListItems} items
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Auto-generated from your meal plan
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pantry">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <Package className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-sm font-medium">Pantry</CardTitle>
              {data.pantryExpiring > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {data.pantryExpiring} expiring
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track what you have on hand
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link href="/deals">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Sale Items</p>
                <p className="text-xs text-muted-foreground">Add this week&apos;s deals</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/meal-plan">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Generate Meal Plan</p>
                <p className="text-xs text-muted-foreground">AI-powered based on sales</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pantry">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">View Pantry</p>
                <p className="text-xs text-muted-foreground">Check what you have</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Expiring items alert */}
      {data.pantryExpiring > 0 && (
        <Card className="mt-6 border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {data.pantryExpiring} pantry item{data.pantryExpiring > 1 ? 's' : ''} expiring soon
              </p>
              <p className="text-sm text-muted-foreground">
                Consider using these items in this week&apos;s meal plan.
              </p>
            </div>
            <Link href="/pantry">
              <Button size="sm" variant="outline">
                View Pantry
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
