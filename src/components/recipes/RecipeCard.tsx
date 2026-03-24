"use client";

import { Clock, Users, Heart, Bookmark, UtensilsCrossed } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface RecipeCardData {
  id: number | string;
  title: string;
  image?: string | null;
  prepTime?: number | null;
  servings?: number | null;
  cuisine?: string | null;
  missedIngredients?: string[];
  usedIngredients?: string[];
  missedIngredientCount?: number;
  usedIngredientCount?: number;
  isFavorited?: boolean;
}

interface RecipeCardProps {
  recipe: RecipeCardData;
  onSave?: (recipe: RecipeCardData) => void;
  onToggleFavorite?: (recipe: RecipeCardData) => void;
  onRemove?: (recipe: RecipeCardData) => void;
  isSaved?: boolean;
  showIngredientMatch?: boolean;
}

export function RecipeCard({
  recipe,
  onSave,
  onToggleFavorite,
  onRemove,
  isSaved = false,
  showIngredientMatch = false,
}: RecipeCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {recipe.cuisine && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2"
          >
            {recipe.cuisine}
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 text-sm font-semibold leading-tight">
          {recipe.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-2">
        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {recipe.prepTime != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.prepTime} min
            </span>
          )}
          {recipe.servings != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings} servings
            </span>
          )}
        </div>

        {/* Ingredient match info (for search by ingredients mode) */}
        {showIngredientMatch && (
          <div className="space-y-1">
            {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Uses: {recipe.usedIngredients.join(", ")}
              </p>
            )}
            {recipe.missedIngredients && recipe.missedIngredients.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Missing: {recipe.missedIngredients.join(", ")}
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {!isSaved && onSave && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onSave(recipe)}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Save
          </Button>
        )}

        {isSaved && onToggleFavorite && (
          <Button
            variant={recipe.isFavorited ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleFavorite(recipe)}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={recipe.isFavorited ? "currentColor" : "none"}
            />
          </Button>
        )}

        {isSaved && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onRemove(recipe)}
          >
            Remove
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
