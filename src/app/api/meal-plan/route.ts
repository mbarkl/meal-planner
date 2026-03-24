import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');
  const id = searchParams.get('id');

  const supabase = createServerClient();

  if (id) {
    // Fetch a single meal plan by id with entries and recipes
    const { data, error } = await supabase
      .from('meal_plans')
      .select(
        `
        *,
        entries:meal_plan_entries(
          *,
          recipe:recipes(
            *,
            ingredients:recipe_ingredients(*)
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  // Fetch meal plans, optionally filtered by weekStart
  let query = supabase
    .from('meal_plans')
    .select(
      `
      *,
      entries:meal_plan_entries(
        *,
        recipe:recipes(
          *,
          ingredients:recipe_ingredients(*)
        )
      )
    `
    )
    .order('created_at', { ascending: false });

  if (weekStart) {
    query = query.eq('week_start', weekStart);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json(
      { error: 'Missing meal plan id' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('meal_plans')
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
      { error: 'Missing meal plan id' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Delete entries first (cascade might handle this, but be explicit)
  const { error: entriesError } = await supabase
    .from('meal_plan_entries')
    .delete()
    .eq('meal_plan_id', id);

  if (entriesError) {
    return NextResponse.json(
      { error: `Failed to delete entries: ${entriesError.message}` },
      { status: 500 }
    );
  }

  // Delete the meal plan
  const { error } = await supabase.from('meal_plans').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
