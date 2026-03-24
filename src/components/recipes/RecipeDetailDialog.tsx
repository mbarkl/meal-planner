'use client';

import {
  Clock, Users, ExternalLink, Heart, UtensilsCrossed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Recipe } from '@/lib/types';

interface RecipeDetailDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
}

export function RecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  onToggleFavorite,
  onDelete,
}: RecipeDetailDialogProps) {
  if (!recipe) return null;

  const totalTime = recipe.total_time_minutes ||
    ((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl leading-tight pr-8">{recipe.title}</DialogTitle>
        </DialogHeader>

        {/* Image */}
        {recipe.image_url && (
          <div className="rounded-lg overflow-hidden aspect-video bg-muted">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {totalTime != null && totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {recipe.prep_time_minutes ? `${recipe.prep_time_minutes} prep` : ''}
              {recipe.prep_time_minutes && recipe.cook_time_minutes ? ' + ' : ''}
              {recipe.cook_time_minutes ? `${recipe.cook_time_minutes} cook` : ''}
              {totalTime ? ` (${totalTime} min total)` : ''}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {recipe.servings} servings
            </span>
          )}
          {recipe.cuisine && (
            <Badge variant="secondary">{recipe.cuisine}</Badge>
          )}
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-sm text-muted-foreground">{recipe.description}</p>
        )}

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2">Ingredients</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                  <span>
                    {ing.quantity != null && ing.quantity > 0 && (
                      <span className="font-medium">{ing.quantity} </span>
                    )}
                    {ing.unit && <span className="font-medium">{ing.unit} </span>}
                    {ing.ingredient_name}
                    {ing.preparation && (
                      <span className="text-muted-foreground">, {ing.preparation}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Directions */}
        {recipe.directions && recipe.directions.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2">Directions</h3>
            <ol className="space-y-3">
              {recipe.directions.map((dir, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground shrink-0 w-5 text-right">
                    {dir.step || idx + 1}.
                  </span>
                  <span>{dir.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View Original
              </Button>
            </a>
          )}
          <div className="flex-1" />
          {onToggleFavorite && (
            <Button
              variant={recipe.is_favorited ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToggleFavorite(recipe)}
            >
              <Heart
                className="h-3.5 w-3.5 mr-1"
                fill={recipe.is_favorited ? 'currentColor' : 'none'}
              />
              {recipe.is_favorited ? 'Favorited' : 'Favorite'}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(recipe);
                onOpenChange(false);
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
