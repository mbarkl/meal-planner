import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body as {
      items: {
        item_name: string;
        store: string;
        category: string;
        sale_price: number;
        regular_price?: number | null;
        week_start?: string | null;
        week_end?: string | null;
      }[];
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty items array' },
        { status: 400 }
      );
    }

    const validItems = items
      .filter((item) => item.item_name?.trim() && item.sale_price != null)
      .map((item) => ({
        item_name: item.item_name.trim(),
        store: item.store || 'frys',
        category: item.category || 'other',
        sale_price: item.sale_price,
        regular_price: item.regular_price || null,
        deal_type: 'sale',
        requires_card: false,
        week_start: item.week_start || null,
        week_end: item.week_end || null,
      }));

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items to import' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('deals')
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
