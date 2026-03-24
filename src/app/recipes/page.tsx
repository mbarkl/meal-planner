"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Heart, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RecipeCard, type RecipeCardData } from "@/components/recipes/RecipeCard";
import type { Recipe } from "@/lib/types";

export default function RecipesPage() {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSavedRecipes = useCallback(async () => {
    try {
      const response = await fetch("/api/recipes");
      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
      }
      const data = await response.json();
      setSavedRecipes(data);
    } catch (error) {
      console.error("Error fetching saved recipes:", error);
      toast.error("Failed to load saved recipes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  const handleToggleFavorite = useCallback(
    async (card: RecipeCardData) => {
      const recipe = savedRecipes.find((r) => r.id === card.id);
      if (!recipe) return;

      const newFavValue = !recipe.is_favorited;

      try {
        const response = await fetch("/api/recipes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: recipe.id,
            is_favorited: newFavValue,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update recipe");
        }

        setSavedRecipes((prev) =>
          prev.map((r) =>
            r.id === recipe.id ? { ...r, is_favorited: newFavValue } : r
          )
        );

        toast.success(
          newFavValue
            ? `"${recipe.title}" added to favorites`
            : `"${recipe.title}" removed from favorites`
        );
      } catch (error) {
        toast.error("Failed to update favorite status");
      }
    },
    [savedRecipes]
  );

  const handleRemove = useCallback(async (card: RecipeCardData) => {
    try {
      const response = await fetch(`/api/recipes?id=${card.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove recipe");
      }

      setSavedRecipes((prev) => prev.filter((r) => r.id !== card.id));
      toast.success(`"${card.title}" removed from your recipes`);
    } catch (error) {
      toast.error("Failed to remove recipe");
    }
  }, []);

  const mapSavedToCard = (recipe: Recipe): RecipeCardData => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image_url,
    prepTime: recipe.total_time_minutes || recipe.prep_time_minutes,
    servings: recipe.servings,
    cuisine: recipe.cuisine,
    isFavorited: recipe.is_favorited,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Recipes</h1>
      <p className="text-muted-foreground mb-6">
        Your saved and AI-generated recipes
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : savedRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Heart className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No recipes yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a meal plan to see AI-created recipes here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={mapSavedToCard(recipe)}
              isSaved
              onToggleFavorite={handleToggleFavorite}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
