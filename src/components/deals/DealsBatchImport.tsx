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
import { CATEGORY_DISPLAY } from '@/lib/constants';

const VALID_STORES = new Set(['frys', 'safeway']);
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_DISPLAY));

// Fuzzy match store names
function normalizeStore(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s === 'frys' || s === "fry's" || s === 'fry' || s === 'frys food') return 'frys';
  if (s === 'safeway' || s === 'sw') return 'safeway';
  return 'frys'; // default
}

// Fuzzy match category names
function normalizeCategory(raw: string): string {
  const s = raw.toLowerCase().trim().replace(/\s+/g, '_').replace(/&/g, '_');
  if (VALID_CATEGORIES.has(s)) return s;
  // Common mappings
  if (s.includes('meat') || s.includes('seafood') || s.includes('chicken') || s.includes('beef')) return 'meat';
  if (s.includes('produce') || s.includes('fruit') || s.includes('vegetable')) return 'produce';
  if (s.includes('dairy') || s.includes('egg') || s.includes('milk') || s.includes('cheese')) return 'dairy';
  if (s.includes('frozen')) return 'frozen';
  if (s.includes('bakery') || s.includes('bread')) return 'bakery';
  if (s.includes('snack') || s.includes('chip')) return 'snacks';
  if (s.includes('beverage') || s.includes('drink') || s.includes('soda') || s.includes('juice')) return 'beverages';
  if (s.includes('deli') || s.includes('prepared')) return 'deli';
  if (s.includes('condiment') || s.includes('sauce')) return 'condiments';
  if (s.includes('breakfast') || s.includes('cereal')) return 'breakfast';
  if (s.includes('household') || s.includes('cleaning')) return 'household';
  if (s.includes('personal') || s.includes('care') || s.includes('health')) return 'personal_care';
  if (s.includes('pantry') || s.includes('staple') || s.includes('canned')) return 'pantry_staples';
  return 'other';
}

interface ParsedDeal {
  item_name: string;
  store: string;
  category: string;
  sale_price: number;
  regular_price: number | null;
  error?: string;
}

function parseTextLine(line: string): ParsedDeal {
  const parts = line.split(',').map((s) => s.trim());
  const deal: ParsedDeal = {
    item_name: '',
    store: 'frys',
    category: 'other',
    sale_price: 0,
    regular_price: null,
  };

  if (parts.length === 0 || !parts[0]) {
    return { ...deal, error: 'Empty line' };
  }

  deal.item_name = parts[0];

  // Parse sale price from second part
  if (parts.length >= 2 && parts[1]) {
    const price = parseFloat(parts[1].replace(/^\$/, ''));
    if (!isNaN(price) && price > 0) {
      deal.sale_price = price;
    } else {
      return { ...deal, error: `Invalid price: "${parts[1]}"` };
    }
  } else {
    return { ...deal, error: 'Missing sale price' };
  }

  // Parse store from third part
  if (parts.length >= 3 && parts[2]) {
    deal.store = normalizeStore(parts[2]);
  }

  // Parse category from fourth part
  if (parts.length >= 4 && parts[3]) {
    deal.category = normalizeCategory(parts[3]);
  }

  // Parse regular price from fifth part
  if (parts.length >= 5 && parts[4]) {
    const regPrice = parseFloat(parts[4].replace(/^\$/, ''));
    if (!isNaN(regPrice) && regPrice > 0) {
      deal.regular_price = regPrice;
    }
  }

  if (!deal.item_name) {
    deal.error = 'Missing item name';
  }

  return deal;
}

function parseCSV(text: string): ParsedDeal[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('name') || firstLine.includes('item') || firstLine.includes('price');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  let headers: string[] = [];
  if (hasHeader) {
    headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  }

  return dataLines.map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const deal: ParsedDeal = {
      item_name: '',
      store: 'frys',
      category: 'other',
      sale_price: 0,
      regular_price: null,
    };

    if (headers.length > 0) {
      headers.forEach((header, idx) => {
        const val = values[idx]?.trim();
        if (!val) return;

        if (header === 'name' || header === 'item' || header === 'item_name') {
          deal.item_name = val;
        } else if (header === 'sale_price' || header === 'price' || header === 'sale') {
          const p = parseFloat(val.replace(/^\$/, ''));
          if (!isNaN(p)) deal.sale_price = p;
        } else if (header === 'regular_price' || header === 'reg_price' || header === 'regular' || header === 'original_price') {
          const p = parseFloat(val.replace(/^\$/, ''));
          if (!isNaN(p)) deal.regular_price = p;
        } else if (header === 'store') {
          deal.store = normalizeStore(val);
        } else if (header === 'category') {
          deal.category = normalizeCategory(val);
        }
      });
    } else {
      return parseTextLine(line);
    }

    if (!deal.item_name) {
      deal.error = 'Missing item name';
    } else if (!deal.sale_price || deal.sale_price <= 0) {
      deal.error = 'Missing or invalid sale price';
    }

    return deal;
  });
}

function getCurrentWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  const lastWednesday = new Date(now);
  lastWednesday.setDate(now.getDate() - daysToWed);
  const nextTuesday = new Date(lastWednesday);
  nextTuesday.setDate(lastWednesday.getDate() + 6);
  return {
    week_start: lastWednesday.toISOString().split('T')[0],
    week_end: nextTuesday.toISOString().split('T')[0],
  };
}

interface DealsBatchImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function DealsBatchImport({ open, onOpenChange, onImported }: DealsBatchImportProps) {
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedDeal[]>([]);
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

    const { week_start, week_end } = getCurrentWeekDates();

    setImporting(true);
    try {
      const res = await fetch('/api/deals/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems.map(({ error, ...item }) => ({
            ...item,
            week_start,
            week_end,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import items');
      }

      const result = await res.json();
      toast.success(`Imported ${result.imported} sale items`);
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
          <DialogTitle>Import Sale Items</DialogTitle>
          <DialogDescription>
            Add multiple sale items at once by pasting a list or uploading a CSV file.
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
                <Label>Sale Items (one per line)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Format: item name, sale price, store, category, regular price
                </p>
                <Textarea
                  placeholder={`Chicken Breast, 2.99, frys, meat, 5.99\nBananas, 0.59, safeway, produce\nMilk, 3.49, frys, dairy, 4.29\nPasta Sauce, 1.99, safeway`}
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Name and sale price are required. Store defaults to Fry&apos;s, category to Other. Prices can include $.
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
                  Columns: item_name, sale_price, store, category, regular_price
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  &quot;item_name&quot; and &quot;sale_price&quot; columns are required. Include a header row.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="secondary">{validCount} valid</Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} errors</Badge>
              )}
            </div>

            <div className="border rounded-md overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Item</th>
                    <th className="text-left px-3 py-2 font-medium">Sale $</th>
                    <th className="text-left px-3 py-2 font-medium">Reg $</th>
                    <th className="text-left px-3 py-2 font-medium">Store</th>
                    <th className="text-left px-3 py-2 font-medium">Category</th>
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
                          item.item_name
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-green-600 font-medium">
                        {item.sale_price > 0 ? `$${item.sale_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {item.regular_price ? `$${item.regular_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {item.store === 'frys' ? "Fry's" : 'Safeway'}
                      </td>
                      <td className="px-3 py-1.5">
                        {CATEGORY_DISPLAY[item.category]?.label || item.category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
