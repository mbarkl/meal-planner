import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');

  const supabase = createServerClient();

  let query = supabase
    .from('pantry_items')
    .select('*')
    .order('name');

  if (location) {
    query = query.eq('location', location);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    category,
    quantity,
    unit,
    location,
    expiration_date,
    is_staple,
    notes,
  } = body;

  if (!name || !quantity || !unit || !location) {
    return NextResponse.json(
      { error: 'Missing required fields: name, quantity, unit, location' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      name,
      category: category || null,
      quantity,
      unit,
      location,
      expiration_date: expiration_date || null,
      is_staple: is_staple ?? false,
      notes: notes || null,
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
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing pantry item id' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('pantry_items')
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
    return NextResponse.json({ error: 'Missing pantry item id' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('pantry_items').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
