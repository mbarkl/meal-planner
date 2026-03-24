'use client';

import { useState } from 'react';
import {
  Globe, FileText, Plus, Trash2, Loader2, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface IngredientRow {
  name: string;
  quantity: string;
  unit: string;
  preparation: string;
}

interface DirectionRow {
  text: string;
}

interface RecipeForm {
  title: string;
  description: string;
  image_url: string;
  source_url: string;
  servings: string;
  prep_time_minutes: string;
  cook_time_minutes: string;
  cuisine: string;
  ingredients: IngredientRow[];
  directions: DirectionRow[];
}

const emptyForm: RecipeForm = {
  title: '',
  description: '',
  image_url: '',
  source_url: '',
  servings: '4',
  prep_time_minutes: '',
  cook_time_minutes: '',
  cuisine: '',
  ingredients: [{ name: '', quantity: '', unit: '', preparation: '' }],
  directions: [{ text: '' }],
};

interface AddRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddRecipeDialog({ open, onOpenChange, onSaved }: AddRecipeDialogProps) {
  const [form, setForm] = useState<RecipeForm>({ ...emptyForm });
  const [importUrl, setImportUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('url');

  function resetState() {
    setForm({ ...emptyForm, ingredients: [{ name: '', quantity: '', unit: '', preparation: '' }], directions: [{ text: '' }] });
    setImportUrl('');
    setPasteText('');
    setShowForm(false);
    setImporting(false);
    setSaving(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetState();
    onOpenChange(open);
  }

  async function handleImportUrl() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import recipe');
      }

      const recipe = await res.json();
      populateForm(recipe);
      setShowForm(true);
      toast.success('Recipe extracted! Review and save.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import');
    } finally {
      setImporting(false);
    }
  }

  async function handleImportText() {
    if (!pasteText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse recipe');
      }

      const recipe = await res.json();
      populateForm(recipe);
      setShowForm(true);
      toast.success('Recipe parsed! Review and save.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse');
    } finally {
      setImporting(false);
    }
  }

  function populateForm(recipe: {
    title?: string;
    description?: string;
    image_url?: string;
    source_url?: string;
    servings?: number;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    cuisine?: string;
    ingredients?: { name: string; quantity?: number; unit?: string; preparation?: string }[];
    directions?: { step: number; text: string }[];
  }) {
    setForm({
      title: recipe.title || '',
      description: recipe.description || '',
      image_url: recipe.image_url || '',
      source_url: recipe.source_url || importUrl || '',
      servings: recipe.servings?.toString() || '4',
      prep_time_minutes: recipe.prep_time_minutes?.toString() || '',
      cook_time_minutes: recipe.cook_time_minutes?.toString() || '',
      cuisine: recipe.cuisine || '',
      ingredients: recipe.ingredients && recipe.ingredients.length > 0
        ? recipe.ingredients.map((i) => ({
            name: i.name || '',
            quantity: i.quantity?.toString() || '',
            unit: i.unit || '',
            preparation: i.preparation || '',
          }))
        : [{ name: '', quantity: '', unit: '', preparation: '' }],
      directions: recipe.directions && recipe.directions.length > 0
        ? recipe.directions.map((d) => ({ text: d.text }))
        : [{ text: '' }],
    });
  }

  function updateIngredient(idx: number, field: keyof IngredientRow, value: string) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === idx ? { ...ing, [field]: value } : ing
      ),
    }));
  }

  function addIngredient() {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '', preparation: '' }],
    }));
  }

  function removeIngredient(idx: number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx),
    }));
  }

  function updateDirection(idx: number, text: string) {
    setForm((prev) => ({
      ...prev,
      directions: prev.directions.map((d, i) =>
        i === idx ? { text } : d
      ),
    }));
  }

  function addDirection() {
    setForm((prev) => ({
      ...prev,
      directions: [...prev.directions, { text: '' }],
    }));
  }

  function removeDirection(idx: number) {
    setForm((prev) => ({
      ...prev,
      directions: prev.directions.filter((_, i) => i !== idx),
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Recipe title is required');
      return;
    }

    setSaving(true);
    try {
      const prepTime = form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null;
      const cookTime = form.cook_time_minutes ? parseInt(form.cook_time_minutes) : null;
      const totalTime = (prepTime || 0) + (cookTime || 0) > 0 ? (prepTime || 0) + (cookTime || 0) : null;

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          image_url: form.image_url.trim() || null,
          source_url: form.source_url.trim() || null,
          servings: form.servings ? parseInt(form.servings) : 4,
          prep_time_minutes: prepTime,
          cook_time_minutes: cookTime,
          total_time_minutes: totalTime,
          cuisine: form.cuisine.trim() || null,
          meal_types: [],
          tags: ['imported'],
          directions: form.directions
            .filter((d) => d.text.trim())
            .map((d, i) => ({ step: i + 1, text: d.text.trim() })),
          is_favorited: false,
          is_user_created: true,
          ingredients: form.ingredients
            .filter((ing) => ing.name.trim())
            .map((ing, i) => ({
              ingredient_name: ing.name.trim(),
              quantity: ing.quantity ? parseFloat(ing.quantity) : null,
              unit: ing.unit.trim() || null,
              preparation: ing.preparation.trim() || null,
              is_optional: false,
              sort_order: i,
            })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save recipe');
      }

      toast.success(`"${form.title}" saved to your cookbook!`);
      handleOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recipe</DialogTitle>
          <DialogDescription>
            Import from a website, paste recipe text, or enter manually.
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
            <TabsList>
              <TabsTrigger value="url">
                <Globe className="h-4 w-4 mr-1" />
                From URL
              </TabsTrigger>
              <TabsTrigger value="paste">
                <FileText className="h-4 w-4 mr-1" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Plus className="h-4 w-4 mr-1" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-3 mt-3">
              <div>
                <Label>Recipe URL</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Paste a link to a recipe page. Works with most recipe sites.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.allrecipes.com/recipe/..."
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleImportUrl();
                    }}
                  />
                  <Button onClick={handleImportUrl} disabled={importing || !importUrl.trim()}>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Pinterest links may not work directly. Copy the actual recipe URL from the pin instead.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="space-y-3 mt-3">
              <div>
                <Label>Recipe Text</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Paste the recipe text (ingredients and directions). AI will parse it for you.
                </p>
                <Textarea
                  placeholder={`Chicken Stir Fry\n\nIngredients:\n2 chicken breasts, sliced\n1 cup broccoli florets\n2 tbsp soy sauce\n...\n\nDirections:\n1. Heat oil in a wok...\n2. Add chicken and cook...`}
                  rows={10}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
              </div>
              <Button onClick={handleImportText} disabled={importing || !pasteText.trim()}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Parsing...
                  </>
                ) : (
                  'Parse Recipe'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="mt-3">
              <Button onClick={() => setShowForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Start Blank Recipe
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          /* Editable recipe form */
          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Recipe title"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description (optional)"
                />
              </div>
              <div>
                <Label>Servings</Label>
                <Input
                  type="number"
                  value={form.servings}
                  onChange={(e) => setForm((f) => ({ ...f, servings: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cuisine</Label>
                <Input
                  value={form.cuisine}
                  onChange={(e) => setForm((f) => ({ ...f, cuisine: e.target.value }))}
                  placeholder="e.g. Italian, Mexican"
                />
              </div>
              <div>
                <Label>Prep Time (min)</Label>
                <Input
                  type="number"
                  value={form.prep_time_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, prep_time_minutes: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cook Time (min)</Label>
                <Input
                  type="number"
                  value={form.cook_time_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, cook_time_minutes: e.target.value }))}
                />
              </div>
              <div>
                <Label>Source URL</Label>
                <Input
                  value={form.source_url}
                  onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ingredients</Label>
                <Button variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-1.5 items-center">
                    <Input
                      placeholder="Ingredient"
                      className="flex-[3]"
                      value={ing.name}
                      onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Qty"
                      className="flex-[1]"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                    />
                    <Input
                      placeholder="Unit"
                      className="flex-[1]"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    />
                    <Input
                      placeholder="Prep"
                      className="flex-[1.5]"
                      value={ing.preparation}
                      onChange={(e) => updateIngredient(idx, 'preparation', e.target.value)}
                    />
                    {form.ingredients.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeIngredient(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Directions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Directions</Label>
                <Button variant="outline" size="sm" onClick={addDirection}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Step
                </Button>
              </div>
              <div className="space-y-1.5">
                {form.directions.map((dir, idx) => (
                  <div key={idx} className="flex gap-1.5 items-start">
                    <span className="text-xs text-muted-foreground mt-2.5 w-6 shrink-0 text-right">
                      {idx + 1}.
                    </span>
                    <Textarea
                      placeholder={`Step ${idx + 1}...`}
                      rows={2}
                      className="flex-1"
                      value={dir.text}
                      onChange={(e) => updateDirection(idx, e.target.value)}
                    />
                    {form.directions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 mt-0.5"
                        onClick={() => removeDirection(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  'Save Recipe'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
