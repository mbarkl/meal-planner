import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body as {
      items: {
        name: string;
        quantity?: number;
        unit?: string;
        location?: string;
        category?: string;
        expiration_date?: string;
        is_staple?: boolean;
        notes?: string;
      }[];
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty items array' },
        { status: 400 }
      );
    }

    // Validate and normalize each item
    const validItems = items
      .filter((item) => item.name && item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity ?? 1,
        unit: item.unit || 'count',
        location: item.location || 'pantry',
        category: item.category || null,
        expiration_date: item.expiration_date || null,
        is_staple: item.is_staple ?? false,
        notes: item.notes || null,
      }));

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items to import' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('pantry_items')
      .insert(validItems)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { imported: data?.length || 0, items: data },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
