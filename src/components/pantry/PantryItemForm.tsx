'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PantryItem, UnitType, PantryLocation } from '@/lib/types';
import { AISLE_ORDER } from '@/lib/constants';

const UNIT_OPTIONS: UnitType[] = [
  'oz', 'lb', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp',
  'count', 'bunch', 'bag', 'box', 'can', 'jar', 'bottle', 'pack', 'other',
];

const LOCATION_OPTIONS: { value: PantryLocation; label: string }[] = [
  { value: 'pantry', label: 'Pantry' },
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
];

interface PantryItemFormProps {
  onSave: (item: PantryItem) => void;
  onCancel: () => void;
  initialData?: PantryItem;
}

export function PantryItemForm({ onSave, onCancel, initialData }: PantryItemFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [quantity, setQuantity] = useState(initialData?.quantity ?? 1);
  const [unit, setUnit] = useState<UnitType>(initialData?.unit ?? 'count');
  const [location, setLocation] = useState<PantryLocation>(initialData?.location ?? 'pantry');
  const [expirationDate, setExpirationDate] = useState(initialData?.expiration_date ?? '');
  const [isStaple, setIsStaple] = useState(initialData?.is_staple ?? false);
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const item = {
      ...(initialData ?? {}),
      name,
      category: category || null,
      quantity,
      unit,
      location,
      expiration_date: expirationDate || null,
      is_staple: isStaple,
      notes: notes || null,
    } as PantryItem;

    onSave(item);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {AISLE_ORDER.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Select value={location} onValueChange={(v) => setLocation(v as PantryLocation)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_OPTIONS.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Unit</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as UnitType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiration_date">Expiration Date</Label>
        <Input
          id="expiration_date"
          type="date"
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_staple"
          checked={isStaple}
          onCheckedChange={(checked) => setIsStaple(checked)}
        />
        <Label htmlFor="is_staple">Staple item (always keep stocked)</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
}
