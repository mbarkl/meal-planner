import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { categorizeIngredient } from '@/lib/categorize-ingredient';

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

  // Auto-recategorize any items stuck in "other" that could be better categorized
  if (data?.items) {
    const updates: { id: string; category: string }[] = [];
    for (const item of data.items) {
      if (!item.category || item.category === 'other') {
        const better = categorizeIngredient(item.ingredient_name);
        if (better !== 'other') {
          updates.push({ id: item.id, category: better });
          item.category = better; // update in response too
        }
      }
    }
    // Fire and forget — update in background
    if (updates.length > 0) {
      for (const u of updates) {
        supabase
          .from('shopping_list_items')
          .update({ category: u.category })
          .eq('id', u.id)
          .then(() => {});
      }
    }
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
    store,
    estimated_price,
    create_list,
  }: {
    shopping_list_id?: string;
    ingredient_name: string;
    quantity?: number | null;
    unit?: string | null;
    category?: string | null;
    notes?: string | null;
    store?: string | null;
    estimated_price?: number | null;
    create_list?: boolean;
  } = body;

  if (!ingredient_name) {
    return NextResponse.json(
      { error: 'Missing required field: ingredient_name' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  let listId = shopping_list_id;

  // If no list ID given, find an existing active list or create one
  if (!listId && create_list) {
    // First, try to find the most recent active shopping list
    const { data: existingList } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingList) {
      listId = existingList.id;
    } else {
      // No active list exists — create a new one
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
      const lastWednesday = new Date(now);
      lastWednesday.setDate(now.getDate() - daysToWed);
      const weekStartStr = lastWednesday.toISOString().split('T')[0];

      const { data: newList, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          week_start: weekStartStr,
          store: null,
          status: 'active',
        })
        .select()
        .single();

      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }
      listId = newList.id;
    }
  }

  if (!listId) {
    return NextResponse.json(
      { error: 'Missing shopping_list_id (or set create_list: true)' },
      { status: 400 }
    );
  }

  // Get the max sort_order for this list
  const { data: maxItem } = await supabase
    .from('shopping_list_items')
    .select('sort_order')
    .eq('shopping_list_id', listId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxItem?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      shopping_list_id: listId,
      ingredient_name,
      quantity: quantity ?? null,
      unit: unit ?? null,
      category: (category && category !== 'other') ? category : categorizeIngredient(ingredient_name),
      estimated_price: estimated_price ?? null,
      deal_id: null,
      is_checked: false,
      is_owned: false,
      added_manually: true,
      notes: notes ?? null,
      sort_order: nextSortOrder,
      store: store ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the item with the list_id so the page can update
  return NextResponse.json({ ...data, _list_id: listId }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates }: {
    id: string;
    is_checked?: boolean;
    is_owned?: boolean;
    store?: string | null;
  } = body;

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
  const clearAll = searchParams.get('clear_all');
  const listId = searchParams.get('list_id');

  const supabase = createServerClient();

  // Clear all items from a list
  if (clearAll === 'true' && listId) {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('shopping_list_id', listId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, cleared: true });
  }

  // Delete a single item
  if (!id) {
    return NextResponse.json(
      { error: 'Missing shopping list item id' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
