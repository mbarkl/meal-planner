import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const store = searchParams.get('store');
  const weekStart = searchParams.get('weekStart');
  const category = searchParams.get('category');

  const supabase = createServerClient();

  let query = supabase
    .from('deals')
    .select('*')
    .order('category')
    .order('sale_price');

  if (store) query = query.eq('store', store);
  if (category) query = query.eq('category', category);

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  } else {
    // Default: get current week's deals (most recent Wednesday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
    const lastWednesday = new Date(now);
    lastWednesday.setDate(now.getDate() - daysToWed);
    const weekStartStr = lastWednesday.toISOString().split('T')[0];
    query = query.eq('week_start', weekStartStr);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { item_name, store, category, sale_price, regular_price, week_start, week_end } = body;

    if (!item_name || !store || !category || sale_price == null) {
      return NextResponse.json(
        { error: 'Missing required fields: item_name, store, category, sale_price' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('deals')
      .insert({
        item_name,
        store,
        category,
        sale_price,
        regular_price: regular_price || null,
        deal_type: 'sale',
        requires_card: false,
        week_start: week_start || null,
        week_end: week_end || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing deal id' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('deals').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing deal id' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
