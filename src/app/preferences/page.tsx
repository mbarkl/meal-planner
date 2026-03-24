'use client';

import { useEffect, useState, KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { UserPreferences } from '@/lib/types';

const DIETARY_OPTIONS = [
  'Gluten-Free',
  'Dairy-Free',
  'Vegetarian',
  'Vegan',
  'Keto',
  'Low-Carb',
  'Paleo',
  'Nut-Free',
  'Low-Sodium',
];

const CUISINE_OPTIONS = [
  'Mexican',
  'Italian',
  'Asian',
  'Mediterranean',
  'American',
  'Indian',
  'Thai',
  'Japanese',
  'Chinese',
  'Korean',
  'Southern',
  'BBQ',
];

function TagInput({
  tags,
  onTagsChange,
  placeholder,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = inputValue.trim();
      if (value && !tags.includes(value)) {
        onTagsChange([...tags, value]);
      }
      setInputValue('');
    }
  }

  function removeTag(tag: string) {
    onTagsChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiCheckboxGroup({
  options,
  selected,
  onSelectedChange,
}: {
  options: string[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
}) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onSelectedChange(selected.filter((s) => s !== option));
    } else {
      onSelectedChange([...selected, option]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={() => toggle(option)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [likedIngredients, setLikedIngredients] = useState<string[]>([]);
  const [dislikedIngredients, setDislikedIngredients] = useState<string[]>([]);
  const [cuisinePreferences, setCuisinePreferences] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState(1);
  const [maxPrepTime, setMaxPrepTime] = useState(30);
  const [cookingSkillLevel, setCookingSkillLevel] = useState('intermediate');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadPreferences() {
      try {
        const res = await fetch('/api/preferences');
        if (!res.ok) throw new Error('Failed to load preferences');
        const data: UserPreferences = await res.json();
        setDietaryRestrictions(data.dietary_restrictions ?? []);
        setAllergies(data.allergies ?? []);
        setLikedIngredients(data.liked_ingredients ?? []);
        setDislikedIngredients(data.disliked_ingredients ?? []);
        setCuisinePreferences(data.cuisine_preferences ?? []);
        setHouseholdSize(data.household_size ?? 1);
        setMaxPrepTime(data.max_prep_time_minutes ?? 30);
        setCookingSkillLevel(data.cooking_skill_level ?? 'intermediate');
        setNotes(data.notes ?? '');
      } catch {
        toast.error('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietary_restrictions: dietaryRestrictions,
          allergies,
          liked_ingredients: likedIngredients,
          disliked_ingredients: dislikedIngredients,
          cuisine_preferences: cuisinePreferences,
          household_size: householdSize,
          max_prep_time_minutes: maxPrepTime,
          cooking_skill_level: cookingSkillLevel,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Preferences</h1>
        <p className="text-muted-foreground mb-6">
          Customize your dietary preferences and cooking profile
        </p>
        <p className="text-sm text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Preferences</h1>
      <p className="text-muted-foreground mb-6">
        Customize your dietary preferences and cooking profile
      </p>

      <div className="space-y-6">
        {/* Dietary Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle>Dietary Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiCheckboxGroup
              options={DIETARY_OPTIONS}
              selected={dietaryRestrictions}
              onSelectedChange={setDietaryRestrictions}
            />
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle>Allergies</CardTitle>
          </CardHeader>
          <CardContent>
            <TagInput
              tags={allergies}
              onTagsChange={setAllergies}
              placeholder="Type an allergy and press Enter"
            />
          </CardContent>
        </Card>

        {/* Liked Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Liked Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <TagInput
              tags={likedIngredients}
              onTagsChange={setLikedIngredients}
              placeholder="Type an ingredient and press Enter"
            />
          </CardContent>
        </Card>

        {/* Disliked Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Disliked Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <TagInput
              tags={dislikedIngredients}
              onTagsChange={setDislikedIngredients}
              placeholder="Type an ingredient and press Enter"
            />
          </CardContent>
        </Card>

        {/* Cuisine Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Cuisine Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiCheckboxGroup
              options={CUISINE_OPTIONS}
              selected={cuisinePreferences}
              onSelectedChange={setCuisinePreferences}
            />
          </CardContent>
        </Card>

        {/* Cooking Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Cooking Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="household-size">Household Size</Label>
                <Input
                  id="household-size"
                  type="number"
                  min={1}
                  max={20}
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-prep-time">Max Prep Time (minutes)</Label>
                <Input
                  id="max-prep-time"
                  type="number"
                  min={5}
                  max={480}
                  value={maxPrepTime}
                  onChange={(e) => setMaxPrepTime(Number(e.target.value))}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Cooking Skill Level</Label>
              <Select
                value={cookingSkillLevel}
                onValueChange={(v) => setCookingSkillLevel(v as string)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select skill level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about your cooking preferences..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}
