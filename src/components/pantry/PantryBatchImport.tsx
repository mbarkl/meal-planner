'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const VALID_UNITS = new Set([
  'oz', 'lb', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp',
  'count', 'bunch', 'bag', 'box', 'can', 'jar', 'bottle', 'pack', 'other',
]);

const VALID_LOCATIONS = new Set(['pantry', 'fridge', 'freezer']);

interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  location: string;
  category: string | null;
  expiration_date: string | null;
  is_staple: boolean;
  notes: string | null;
  error?: string;
}

function parseTextLine(line: string): ParsedItem {
  const parts = line.split(',').map((s) => s.trim());
  const item: ParsedItem = {
    name: '',
    quantity: 1,
    unit: 'count',
    location: 'pantry',
    category: null,
    expiration_date: null,
    is_staple: false,
    notes: null,
  };

  if (parts.length === 0 || !parts[0]) {
    return { ...item, error: 'Empty line' };
  }

  item.name = parts[0];

  // Parse "2 lb" style quantity+unit from second part
  if (parts.length >= 2 && parts[1]) {
    const qtyMatch = parts[1].match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (qtyMatch) {
      item.quantity = parseFloat(qtyMatch[1]);
      const unitStr = qtyMatch[2].toLowerCase().trim();
      if (unitStr && VALID_UNITS.has(unitStr)) {
        item.unit = unitStr;
      } else if (unitStr) {
        // Try plural removal
        const singular = unitStr.replace(/s$/, '');
        if (VALID_UNITS.has(singular)) {
          item.unit = singular;
        }
      }
    } else {
      // Maybe just a unit like "bag"
      const unitStr = parts[1].toLowerCase();
      if (VALID_UNITS.has(unitStr)) {
        item.unit = unitStr;
      }
    }
  }

  // Parse location from third part
  if (parts.length >= 3 && parts[2]) {
    const loc = parts[2].toLowerCase().trim();
    if (VALID_LOCATIONS.has(loc)) {
      item.location = loc;
    }
  }

  // Parse expiration date from fourth part
  if (parts.length >= 4 && parts[3]) {
    const dateStr = parts[3].trim();
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      item.expiration_date = parsed.toISOString().split('T')[0];
    }
  }

  if (!item.name) {
    item.error = 'Missing item name';
  }

  return item;
}

function parseCSV(text: string): ParsedItem[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('name') || firstLine.includes('item');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Parse header to map columns
  let headers: string[] = [];
  if (hasHeader) {
    headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  }

  return dataLines.map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const item: ParsedItem = {
      name: '',
      quantity: 1,
      unit: 'count',
      location: 'pantry',
      category: null,
      expiration_date: null,
      is_staple: false,
      notes: null,
    };

    if (headers.length > 0) {
      headers.forEach((header, idx) => {
        const val = values[idx]?.trim();
        if (!val) return;

        if (header === 'name' || header === 'item' || header === 'item_name') {
          item.name = val;
        } else if (header === 'quantity' || header === 'qty') {
          const n = parseFloat(val);
          if (!isNaN(n)) item.quantity = n;
        } else if (header === 'unit') {
          const u = val.toLowerCase();
          if (VALID_UNITS.has(u)) item.unit = u;
        } else if (header === 'location') {
          const l = val.toLowerCase();
          if (VALID_LOCATIONS.has(l)) item.location = l;
        } else if (header === 'category') {
          item.category = val;
        } else if (header === 'expiration_date' || header === 'expiration' || header === 'expires') {
          const d = new Date(val);
          if (!isNaN(d.getTime())) item.expiration_date = d.toISOString().split('T')[0];
        } else if (header === 'is_staple' || header === 'staple') {
          item.is_staple = val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'yes';
        } else if (header === 'notes') {
          item.notes = val;
        }
      });
    } else {
      // No header — treat as: name, quantity unit, location, expiration
      return parseTextLine(line);
    }

    if (!item.name) {
      item.error = 'Missing item name';
    }

    return item;
  });
}

interface PantryBatchImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function PantryBatchImport({ open, onOpenChange, onImported }: PantryBatchImportProps) {
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleParseText() {
    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const items = lines.map(parseTextLine);
    setParsedItems(items);
    setShowPreview(true);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const items = parseCSV(text);
      setParsedItems(items);
      setShowPreview(true);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const validItems = parsedItems.filter((item) => !item.error);
    if (validItems.length === 0) {
      toast.error('No valid items to import');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/pantry/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems.map(({ error, ...item }) => item),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import items');
      }

      const result = await res.json();
      toast.success(`Imported ${result.imported} items`);
      resetState();
      onOpenChange(false);
      onImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import');
    } finally {
      setImporting(false);
    }
  }

  function resetState() {
    setPasteText('');
    setParsedItems([]);
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetState();
    onOpenChange(open);
  }

  const validCount = parsedItems.filter((i) => !i.error).length;
  const errorCount = parsedItems.filter((i) => i.error).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Pantry Items</DialogTitle>
          <DialogDescription>
            Add multiple items at once by pasting a list or uploading a CSV file.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <Tabs defaultValue="paste">
            <TabsList>
              <TabsTrigger value="paste">
                <FileText className="h-4 w-4 mr-1" />
                Paste List
              </TabsTrigger>
              <TabsTrigger value="csv">
                <Upload className="h-4 w-4 mr-1" />
                Upload CSV
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-3 mt-3">
              <div>
                <Label>Items (one per line)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Format: name, quantity unit, location, expiration date
                </p>
                <Textarea
                  placeholder={`Chicken breast, 2 lb, fridge\nRice, 1 bag, pantry\nMilk, 1 count, fridge, 2026-04-01\nOlive oil, 1 bottle, pantry`}
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only name is required. Defaults: quantity=1, unit=count, location=pantry
                </p>
              </div>
              <Button
                onClick={handleParseText}
                disabled={!pasteText.trim()}
              >
                Preview Items
              </Button>
            </TabsContent>

            <TabsContent value="csv" className="space-y-3 mt-3">
              <div>
                <Label>Upload CSV File</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Columns: name, quantity, unit, location, category, expiration_date, is_staple, notes
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only the &quot;name&quot; column is required. Include a header row.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            {/* Summary badges */}
            <div className="flex gap-2">
              <Badge variant="secondary">{validCount} valid</Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} errors</Badge>
              )}
            </div>

            {/* Preview table */}
            <div className="border rounded-md overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Qty</th>
                    <th className="text-left px-3 py-2 font-medium">Unit</th>
                    <th className="text-left px-3 py-2 font-medium">Location</th>
                    <th className="text-left px-3 py-2 font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.error ? 'bg-destructive/10' : 'hover:bg-muted/30'}
                    >
                      <td className="px-3 py-1.5">
                        {item.error ? (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {item.error}
                          </span>
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-3 py-1.5">{item.quantity}</td>
                      <td className="px-3 py-1.5">{item.unit}</td>
                      <td className="px-3 py-1.5 capitalize">{item.location}</td>
                      <td className="px-3 py-1.5">{item.expiration_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Import {validCount} Item{validCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
