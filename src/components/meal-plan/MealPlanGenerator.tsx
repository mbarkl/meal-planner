"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StoreName } from "@/lib/types";

type StorePreference = StoreName | "either";

interface MealPlanGeneratorProps {
  onGenerate: (
    weekStart: string,
    numMeals: number,
    numPeople: number,
    storePreference: StoreName | null
  ) => void;
  isLoading: boolean;
}

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  return monday.toISOString().split("T")[0];
}

export function MealPlanGenerator({
  onGenerate,
  isLoading,
}: MealPlanGeneratorProps) {
  const [storePref, setStorePref] = useState<StorePreference>("either");
  const [numMeals, setNumMeals] = useState(14);
  const [numPeople, setNumPeople] = useState(1);
  const [weekStart] = useState(getNextMonday);

  function handleGenerate() {
    const storeValue: StoreName | null =
      storePref === "either" ? null : storePref;
    onGenerate(weekStart, numMeals, numPeople, storeValue);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-amber-500" />
          Generate Meal Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Store preference */}
          <div className="space-y-2">
            <Label>Store Preference</Label>
            <Select
              value={storePref}
              onValueChange={(v) => setStorePref(v as StorePreference)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="either">Either Store</SelectItem>
                <SelectItem value="frys">Fry&apos;s</SelectItem>
                <SelectItem value="safeway">Safeway</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Number of meals */}
          <div className="space-y-2">
            <Label htmlFor="numMeals">Number of Meals</Label>
            <Input
              id="numMeals"
              type="number"
              min={1}
              max={28}
              value={numMeals}
              onChange={(e) =>
                setNumMeals(Math.max(1, parseInt(e.target.value) || 1))
              }
            />
          </div>

          {/* Number of people */}
          <div className="space-y-2">
            <Label htmlFor="numPeople">Number of People</Label>
            <Input
              id="numPeople"
              type="number"
              min={1}
              max={12}
              value={numPeople}
              onChange={(e) =>
                setNumPeople(Math.max(1, parseInt(e.target.value) || 1))
              }
            />
          </div>

          {/* Generate button */}
          <div className="flex items-end">
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Meal Plan
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Week starting {weekStart}. Uses current sale items and your pantry to create an optimized meal plan.
        </p>
      </CardContent>
    </Card>
  );
}
