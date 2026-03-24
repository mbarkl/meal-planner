import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateMealPlan } from '@/lib/claude/generate-meal-plan';
import type { Deal, PantryItem, UserPreferences, StoreName, MealType, UnitType } from '@/lib/types';
import { DAYS_OF_WEEK, MEAL_TYPES } from '@/lib/types';

const USER_ID = '00000000-0000-0000-0000-000000000001';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      weekStart,
      numMeals = 14,
      numPeople = 1,
      storePreference = null,
    }: {
      weekStart: string;
      numMeals?: number;
      numPeople?: number;
      storePreference?: StoreName | null;
    } = body;

    if (!weekStart) {
      return NextResponse.json(
        { error: 'Missing required field: weekStart' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch current week's deals (filtered by store if provided)
    let dealsQuery = supabase
      .from('deals')
      .select('*')
      .order('category')
      .order('sale_price');

    if (storePreference) {
      dealsQuery = dealsQuery.eq('store', storePreference);
    }

    // Get deals for the current ad week (most recent Wednesday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
    const lastWednesday = new Date(now);
    lastWednesday.setDate(now.getDate() - daysToWed);
    const adWeekStart = lastWednesday.toISOString().split('T')[0];
    dealsQuery = dealsQuery.eq('week_start', adWeekStart);

    const { data: deals, error: dealsError } = await dealsQuery;
    if (dealsError) {
      console.error('Error fetching deals:', dealsError);
      // Continue with empty deals rather than failing
    }

    // Fetch pantry items
    const { data: pantryItems, error: pantryError } = await supabase
      .from('pantry_items')
      .select('*')
      .order('expiration_date', { ascending: true, nullsFirst: false });

    if (pantryError) {
      console.error('Error fetching pantry items:', pantryError);
    }

    // Fetch user preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', USER_ID)
      .single();

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
    }

    // Default preferences if none found
    const userPreferences: UserPreferences = preferences || {
      id: USER_ID,
      dietary_restrictions: [],
      allergies: [],
      disliked_ingredients: [],
      liked_ingredients: [],
      cuisine_preferences: [],
      max_prep_time_minutes: 60,
      cooking_skill_level: 'intermediate',
      household_size: numPeople,
      notes: null,
    };

    // Generate the meal plan using Claude
    const generatedMeals = await generateMealPlan({
      deals: (deals as Deal[]) || [],
      pantryItems: (pantryItems as PantryItem[]) || [],
      preferences: userPreferences,
      numMeals,
      numPeople,
      storePref: storePreference,
    });

    // Create the meal_plan row
    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .insert({
        week_start: weekStart,
        store_preference: storePreference,
        num_meals: numMeals,
        num_people: numPeople,
        status: 'draft',
        notes: null,
      })
      .select()
      .single();

    if (planError) {
      return NextResponse.json(
        { error: `Failed to create meal plan: ${planError.message}` },
        { status: 500 }
      );
    }

    // Build a map of recipe titles to IDs for leftover references
    const recipeTitleToId: Record<string, string> = {};
    const entries: Array<{
      meal_plan_id: string;
      day: string;
      meal_type: string;
      recipe_id: string;
      custom_meal_name: string | null;
      servings: number;
      is_leftover: boolean;
      leftover_source_id: string | null;
      prep_notes: string | null;
      sort_order: number;
    }> = [];

    // Process non-leftover meals first so we can reference them
    const nonLeftoverMeals = generatedMeals.filter((m) => !m.is_leftover);
    const leftoverMeals = generatedMeals.filter((m) => m.is_leftover);

    let sortOrder = 0;

    for (const meal of nonLeftoverMeals) {
      // Validate day and meal_type
      const validDay = DAYS_OF_WEEK.includes(meal.day) ? meal.day : 'monday';
      const validMealType = MEAL_TYPES.includes(meal.meal_type) ? meal.meal_type : 'dinner';

      // Create the recipe
      const totalTime =
        (meal.prep_time || 0) + (meal.cook_time || 0) > 0
          ? (meal.prep_time || 0) + (meal.cook_time || 0)
          : null;

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: meal.recipe_title,
          description: meal.prep_notes,
          servings: meal.servings,
          prep_time_minutes: meal.prep_time,
          cook_time_minutes: meal.cook_time,
          total_time_minutes: totalTime,
          meal_types: [validMealType],
          directions: meal.directions,
          tags: ['ai-generated', 'meal-plan'],
          is_user_created: true,
          is_favorited: false,
          times_made: 0,
        })
        .select()
        .single();

      if (recipeError) {
        console.error(`Error creating recipe "${meal.recipe_title}":`, recipeError);
        continue;
      }

      recipeTitleToId[meal.recipe_title] = recipe.id;

      // Insert ingredients
      if (meal.ingredients.length > 0) {
        const ingredientRows = meal.ingredients.map((ing, idx) => ({
          recipe_id: recipe.id,
          ingredient_name: ing.name,
          quantity: ing.quantity,
          unit: (ing.unit as UnitType) || null,
          preparation: ing.preparation,
          is_optional: false,
          sort_order: idx,
        }));

        const { error: ingError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientRows);

        if (ingError) {
          console.error('Error inserting ingredients:', ingError);
        }
      }

      entries.push({
        meal_plan_id: mealPlan.id,
        day: validDay,
        meal_type: validMealType,
        recipe_id: recipe.id,
        custom_meal_name: null,
        servings: meal.servings,
        is_leftover: false,
        leftover_source_id: null,
        prep_notes: meal.prep_notes,
        sort_order: sortOrder++,
      });
    }

    // Now process leftover meals
    for (const meal of leftoverMeals) {
      const validDay = DAYS_OF_WEEK.includes(meal.day) ? meal.day : 'monday';
      const validMealType = MEAL_TYPES.includes(meal.meal_type) ? meal.meal_type : 'dinner';

      const totalTime =
        (meal.prep_time || 0) + (meal.cook_time || 0) > 0
          ? (meal.prep_time || 0) + (meal.cook_time || 0)
          : null;

      // Find the source recipe id
      const sourceRecipeId = meal.leftover_source
        ? recipeTitleToId[meal.leftover_source] || null
        : null;

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: meal.recipe_title,
          description: meal.prep_notes,
          servings: meal.servings,
          prep_time_minutes: meal.prep_time,
          cook_time_minutes: meal.cook_time,
          total_time_minutes: totalTime,
          meal_types: [validMealType],
          directions: meal.directions,
          tags: ['ai-generated', 'meal-plan', 'leftover'],
          is_user_created: true,
          is_favorited: false,
          times_made: 0,
          leftover_recipe_id: sourceRecipeId,
        })
        .select()
        .single();

      if (recipeError) {
        console.error(`Error creating leftover recipe "${meal.recipe_title}":`, recipeError);
        continue;
      }

      recipeTitleToId[meal.recipe_title] = recipe.id;

      // Insert any additional ingredients for the leftover meal
      if (meal.ingredients.length > 0) {
        const ingredientRows = meal.ingredients.map((ing, idx) => ({
          recipe_id: recipe.id,
          ingredient_name: ing.name,
          quantity: ing.quantity,
          unit: (ing.unit as UnitType) || null,
          preparation: ing.preparation,
          is_optional: false,
          sort_order: idx,
        }));

        const { error: ingError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientRows);

        if (ingError) {
          console.error('Error inserting leftover ingredients:', ingError);
        }
      }

      // Find the leftover_source_id (the meal_plan_entry for the source meal)
      const sourceEntry = entries.find(
        (e) => e.recipe_id === sourceRecipeId
      );

      entries.push({
        meal_plan_id: mealPlan.id,
        day: validDay,
        meal_type: validMealType,
        recipe_id: recipe.id,
        custom_meal_name: null,
        servings: meal.servings,
        is_leftover: true,
        leftover_source_id: sourceEntry?.recipe_id || null,
        prep_notes: meal.prep_notes,
        sort_order: sortOrder++,
      });
    }

    // Insert all meal plan entries
    if (entries.length > 0) {
      const { error: entriesError } = await supabase
        .from('meal_plan_entries')
        .insert(entries);

      if (entriesError) {
        return NextResponse.json(
          { error: `Failed to create meal plan entries: ${entriesError.message}` },
          { status: 500 }
        );
      }
    }

    // Fetch the complete meal plan with entries and recipes
    const { data: completePlan, error: fetchError } = await supabase
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
      .eq('id', mealPlan.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch complete meal plan: ${fetchError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(completePlan, { status: 201 });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to generate meal plan: ${message}` },
      { status: 500 }
    );
  }
}
