import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');

  const supabase = createServerClient();

  let query = supabase
    .from('shopping_lists')
    .select('*, items:shopping_list_items(*)')
    .order('created_at', { ascending: false });

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  }

  // Get most recent list (or filtered by weekStart)
  const { data, error } = await query.limit(1).single();

  if (error) {
    // No list found is not an error - return null
    if (error.code === 'PGRST116') {
      return NextResponse.json(null);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    shopping_list_id,
    ingredient_name,
    quantity,
    unit,
    category,
    notes,
  }: {
    shopping_list_id: string;
    ingredient_name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: string | null;
    notes?: string | null;
  } = body;

  if (!shopping_list_id || !ingredient_name) {
    return NextResponse.json(
      { error: 'Missing required fields: shopping_list_id, ingredient_name' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Get the max sort_order for this list
  const { data: maxItem } = await supabase
    .from('shopping_list_items')
    .select('sort_order')
    .eq('shopping_list_id', shopping_list_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxItem?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      shopping_list_id,
      ingredient_name,
      quantity: quantity ?? null,
      unit: unit ?? null,
      category: category ?? 'other',
      estimated_price: null,
      deal_id: null,
      is_checked: false,
      is_owned: false,
      added_manually: true,
      notes: notes ?? null,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates }: { id: string; is_checked?: boolean; is_owned?: boolean } = body;

  if (!id) {
    return NextResponse.json(
      { error: 'Missing shopping list item id' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('shopping_list_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing shopping list item id' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
