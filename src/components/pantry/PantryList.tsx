'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import type { PantryItem } from '@/lib/types';

interface PantryListProps {
  items: PantryItem[];
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
  onAddToShoppingList?: (item: PantryItem) => void;
}

function getExpirationColor(expirationDate: string | null): string {
  if (!expirationDate) return '';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate + 'T00:00:00');
  const diffMs = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 2) return 'text-red-600 dark:text-red-400';
  if (diffDays <= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-green-600 dark:text-green-400';
}

function formatExpiration(expirationDate: string | null): string {
  if (!expirationDate) return '--';
  const date = new Date(expirationDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PantryList({ items, onEdit, onDelete, onAddToShoppingList }: PantryListProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No items in this location yet. Add one to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Qty / Unit</TableHead>
          <TableHead>Expiration</TableHead>
          <TableHead>Staple</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>
              {item.quantity} {item.unit}
            </TableCell>
            <TableCell className={getExpirationColor(item.expiration_date)}>
              {formatExpiration(item.expiration_date)}
            </TableCell>
            <TableCell>
              {item.is_staple && (
                <Badge variant="secondary">Staple</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                {onAddToShoppingList && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onAddToShoppingList(item)}
                    title="Add to Shopping List"
                  >
                    <ShoppingCart className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
