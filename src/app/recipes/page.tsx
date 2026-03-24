"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RecipeCard, type RecipeCardData } from "@/components/recipes/RecipeCard";
import { AddRecipeDialog } from "@/components/recipes/AddRecipeDialog";
import { RecipeDetailDialog } from "@/components/recipes/RecipeDetailDialog";
import type { Recipe } from "@/lib/types";

export default function RecipesPage() {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  const handleToggleFavorite = useCallback(
    async (recipe: Recipe) => {
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

        if (!response.ok) throw new Error("Failed to update recipe");

        setSavedRecipes((prev) =>
          prev.map((r) =>
            r.id === recipe.id ? { ...r, is_favorited: newFavValue } : r
          )
        );

        // Also update the selected recipe if it's the same one
        setSelectedRecipe((prev) =>
          prev?.id === recipe.id ? { ...prev, is_favorited: newFavValue } : prev
        );

        toast.success(
          newFavValue
            ? `"${recipe.title}" added to favorites`
            : `"${recipe.title}" removed from favorites`
        );
      } catch {
        toast.error("Failed to update favorite status");
      }
    },
    []
  );

  const handleCardFavorite = useCallback(
    (card: RecipeCardData) => {
      const recipe = savedRecipes.find((r) => r.id === card.id);
      if (recipe) handleToggleFavorite(recipe);
    },
    [savedRecipes, handleToggleFavorite]
  );

  const handleDelete = useCallback(async (recipe: Recipe) => {
    try {
      const response = await fetch(`/api/recipes?id=${recipe.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove recipe");

      setSavedRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
      toast.success(`"${recipe.title}" removed`);
    } catch {
      toast.error("Failed to remove recipe");
    }
  }, []);

  const handleCardRemove = useCallback(
    (card: RecipeCardData) => {
      const recipe = savedRecipes.find((r) => r.id === card.id);
      if (recipe) handleDelete(recipe);
    },
    [savedRecipes, handleDelete]
  );

  const handleCardClick = useCallback(
    (card: RecipeCardData) => {
      const recipe = savedRecipes.find((r) => r.id === card.id);
      if (recipe) {
        setSelectedRecipe(recipe);
        setDetailOpen(true);
      }
    },
    [savedRecipes]
  );

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">My Recipes</h1>
          <p className="text-muted-foreground">
            Your personal cookbook &mdash; {savedRecipes.length} recipe{savedRecipes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Recipe
        </Button>
      </div>

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
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add recipes from websites, paste recipe text, or enter them manually.
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Your First Recipe
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedRecipes.map((recipe) => (
            <div key={recipe.id} onClick={() => handleCardClick(mapSavedToCard(recipe))} className="cursor-pointer">
              <RecipeCard
                recipe={mapSavedToCard(recipe)}
                isSaved
                onToggleFavorite={handleCardFavorite}
                onRemove={handleCardRemove}
              />
            </div>
          ))}
        </div>
      )}

      <AddRecipeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSaved={fetchSavedRecipes}
      />

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDelete}
      />
    </div>
  );
}
