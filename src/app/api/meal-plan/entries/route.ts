import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Add a meal entry to a meal plan
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { meal_plan_id, day, meal_type, recipe_id, custom_meal_name } = body;

    if (!meal_plan_id || !day || !meal_type) {
      return NextResponse.json(
        { error: 'Missing required fields: meal_plan_id, day, meal_type' },
        { status: 400 }
      );
    }

    if (!recipe_id && !custom_meal_name) {
      return NextResponse.json(
        { error: 'Provide either recipe_id or custom_meal_name' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get max sort_order for this plan
    const { data: existing } = await supabase
      .from('meal_plan_entries')
      .select('sort_order')
      .eq('meal_plan_id', meal_plan_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data: entry, error } = await supabase
      .from('meal_plan_entries')
      .insert({
        meal_plan_id,
        day,
        meal_type,
        recipe_id: recipe_id || null,
        custom_meal_name: custom_meal_name || null,
        servings: 1,
        is_leftover: false,
        leftover_source_id: null,
        prep_notes: null,
        sort_order: nextOrder,
      })
      .select(`
        *,
        recipe:recipes(
          *,
          ingredients:recipe_ingredients(*)
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Remove a meal entry
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('meal_plan_entries')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
