import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isFavorited = searchParams.get('is_favorited');
  const isUserCreated = searchParams.get('is_user_created');

  const supabase = createServerClient();

  let query = supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .order('created_at', { ascending: false });

  if (isFavorited === 'true') {
    query = query.eq('is_favorited', true);
  }

  if (isUserCreated === 'true') {
    query = query.eq('is_user_created', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map recipe_ingredients to ingredients for consistency with the Recipe type
  const recipes = (data || []).map((recipe: Record<string, unknown>) => ({
    ...recipe,
    ingredients: recipe.recipe_ingredients,
  }));

  return NextResponse.json(recipes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    spoonacular_id,
    title,
    description,
    image_url,
    source_url,
    servings,
    prep_time_minutes,
    cook_time_minutes,
    total_time_minutes,
    cuisine,
    meal_types,
    tags,
    directions,
    nutrition,
    is_favorited,
    is_user_created,
    notes,
    ingredients,
  } = body;

  if (!title) {
    return NextResponse.json(
      { error: 'Missing required field: title' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Insert the recipe
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      spoonacular_id: spoonacular_id || null,
      title,
      description: description || null,
      image_url: image_url || null,
      source_url: source_url || null,
      servings: servings || 1,
      prep_time_minutes: prep_time_minutes || null,
      cook_time_minutes: cook_time_minutes || null,
      total_time_minutes: total_time_minutes || null,
      cuisine: cuisine || null,
      meal_types: meal_types || [],
      tags: tags || [],
      directions: directions || [],
      nutrition: nutrition || null,
      is_favorited: is_favorited ?? false,
      is_user_created: is_user_created ?? false,
      notes: notes || null,
    })
    .select()
    .single();

  if (recipeError) {
    return NextResponse.json({ error: recipeError.message }, { status: 500 });
  }

  // Insert ingredients if provided
  if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
    const ingredientRows = ingredients.map(
      (
        ing: {
          ingredient_name: string;
          quantity?: number;
          unit?: string;
          preparation?: string;
          is_optional?: boolean;
          sort_order?: number;
        },
        index: number
      ) => ({
        recipe_id: recipe.id,
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity || null,
        unit: ing.unit || null,
        preparation: ing.preparation || null,
        is_optional: ing.is_optional ?? false,
        sort_order: ing.sort_order ?? index,
      })
    );

    const { error: ingredientError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientRows);

    if (ingredientError) {
      console.error('Error inserting ingredients:', ingredientError);
    }
  }

  return NextResponse.json(recipe, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing recipe id' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('recipes')
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
    return NextResponse.json({ error: 'Missing recipe id' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Delete ingredients first (cascade might handle this, but be explicit)
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);

  const { error } = await supabase.from('recipes').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
