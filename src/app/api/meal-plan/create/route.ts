import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Create an empty meal plan for a given week
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { week_start } = body;

    if (!week_start) {
      return NextResponse.json(
        { error: 'Missing required field: week_start' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if one already exists for this week
    const { data: existing } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('week_start', week_start)
      .limit(1);

    if (existing && existing.length > 0) {
      // Return the existing one with entries
      const { data: full } = await supabase
        .from('meal_plans')
        .select(`
          *,
          entries:meal_plan_entries(
            *,
            recipe:recipes(
              *,
              ingredients:recipe_ingredients(*)
            )
          )
        `)
        .eq('id', existing[0].id)
        .single();

      return NextResponse.json(full || existing[0]);
    }

    // Create a new empty plan
    const { data: plan, error } = await supabase
      .from('meal_plans')
      .insert({
        week_start,
        num_meals: 0,
        num_people: 1,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return with empty entries array
    return NextResponse.json({ ...plan, entries: [] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
