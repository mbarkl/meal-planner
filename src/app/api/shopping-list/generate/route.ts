import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { AISLE_ORDER } from '@/lib/constants';
import { categorizeIngredient } from '@/lib/categorize-ingredient';
import type { ShoppingListItem, UnitType } from '@/lib/types';

interface AggregatedIngredient {
  ingredient_name: string;
  quantity: number | null;
  unit: UnitType | null;
  category: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mealPlanId }: { mealPlanId: string } = body;

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'Missing required field: mealPlanId' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch the meal plan with entries, recipes, and ingredients
    const { data: mealPlan, error: planError } = await supabase
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
      .eq('id', mealPlanId)
      .single();

    if (planError || !mealPlan) {
      return NextResponse.json(
        { error: `Meal plan not found: ${planError?.message || 'Not found'}` },
        { status: 404 }
      );
    }

    // Aggregate ingredients across all non-leftover meals
    const ingredientMap = new Map<string, AggregatedIngredient>();

    for (const entry of mealPlan.entries || []) {
      // Skip leftover meals - they don't need new ingredients
      if (entry.is_leftover) continue;

      const recipe = entry.recipe;
      if (!recipe || !recipe.ingredients) continue;

      for (const ing of recipe.ingredients) {
        const key = ing.ingredient_name.toLowerCase().trim();
        const existing = ingredientMap.get(key);

        if (existing) {
          // Combine quantities if both have values and same unit
          if (
            existing.quantity !== null &&
            ing.quantity !== null &&
            existing.unit === ing.unit
          ) {
            existing.quantity += ing.quantity;
          } else if (existing.quantity === null && ing.quantity !== null) {
            existing.quantity = ing.quantity;
            existing.unit = ing.unit;
          }
          // If units differ, keep the first one (best effort)
        } else {
          ingredientMap.set(key, {
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit as UnitType | null,
            category: categorizeIngredient(ing.ingredient_name),
          });
        }
      }
    }

    // Fetch pantry items to mark owned ingredients
    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('*')
      .order('name');

    const pantryNames = new Set(
      (pantryItems || []).map((p) => p.name.toLowerCase().trim())
    );

    // Fetch current deals to match sale prices
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
    const lastWednesday = new Date(now);
    lastWednesday.setDate(now.getDate() - daysToWed);
    const adWeekStart = lastWednesday.toISOString().split('T')[0];

    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('week_start', adWeekStart);

    // Build a map of deal names for matching
    const dealMap = new Map<string, { sale_price: number; deal_id: string }>();
    for (const deal of deals || []) {
      dealMap.set(deal.item_name.toLowerCase().trim(), {
        sale_price: deal.sale_price,
        deal_id: deal.id,
      });
    }

    // Find an existing active shopping list to merge into, or create one
    let listId: string;

    // First try: find the most recent active list
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
      // No active list — create a new one
      const { data: newList, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          meal_plan_id: mealPlanId,
          week_start: mealPlan.week_start,
          store: mealPlan.store_preference || null,
          status: 'active',
        })
        .select()
        .single();

      if (listError || !newList) {
        return NextResponse.json(
          { error: `Failed to create shopping list: ${listError?.message}` },
          { status: 500 }
        );
      }
      listId = newList.id;
    }

    // Get existing item names so we don't add duplicates
    const { data: existingItems } = await supabase
      .from('shopping_list_items')
      .select('ingredient_name')
      .eq('shopping_list_id', listId);

    const existingNames = new Set(
      (existingItems || []).map((i) => i.ingredient_name.toLowerCase().trim())
    );

    // Get max sort_order from existing items so new items come after
    const { data: maxSortItem } = await supabase
      .from('shopping_list_items')
      .select('sort_order')
      .eq('shopping_list_id', listId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    // Assign categories based on AISLE_ORDER, matching ingredient names to deal categories
    // and create shopping list items
    const items: Array<Omit<ShoppingListItem, 'id'>> = [];
    let sortOrder = (maxSortItem?.sort_order ?? -1) + 1;

    // Group by category using AISLE_ORDER
    for (const category of AISLE_ORDER) {
      const categoryIngredients = Array.from(ingredientMap.values()).filter(
        (ing) => {
          // Try to find a matching deal to get category
          const dealInfo = dealMap.get(ing.ingredient_name.toLowerCase().trim());
          if (dealInfo) {
            // Check if this deal's category matches the current aisle
            const deal = (deals || []).find((d) => d.id === dealInfo.deal_id);
            if (deal && deal.category === category) return true;
          }
          // Default assignment: if category is 'other' and ingredient wasn't assigned yet
          if (category === 'other' && ing.category === 'other') return true;
          return false;
        }
      );

      for (const ing of categoryIngredients) {
        const key = ing.ingredient_name.toLowerCase().trim();
        const dealInfo = dealMap.get(key);
        const isOwned = pantryNames.has(key);

        items.push({
          shopping_list_id: listId,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          category,
          estimated_price: dealInfo ? dealInfo.sale_price : null,
          deal_id: dealInfo ? dealInfo.deal_id : null,
          is_checked: false,
          is_owned: isOwned,
          added_manually: false,
          notes: null,
          sort_order: sortOrder++,
          store: null,
        });

        // Mark as assigned so it doesn't end up in 'other' again
        ing.category = category;
      }
    }

    // Catch any ingredients that weren't assigned via deals - put them in 'other'
    for (const ing of ingredientMap.values()) {
      if (ing.category === 'other') {
        // Check if already added
        const alreadyAdded = items.some(
          (item) =>
            item.ingredient_name.toLowerCase() ===
            ing.ingredient_name.toLowerCase()
        );
        if (alreadyAdded) continue;

        const key = ing.ingredient_name.toLowerCase().trim();
        const dealInfo = dealMap.get(key);
        const isOwned = pantryNames.has(key);

        items.push({
          shopping_list_id: listId,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: 'other',
          estimated_price: dealInfo ? dealInfo.sale_price : null,
          deal_id: dealInfo ? dealInfo.deal_id : null,
          is_checked: false,
          is_owned: isOwned,
          added_manually: false,
          notes: null,
          sort_order: sortOrder++,
          store: null,
        });
      }
    }

    // Filter out items that already exist on the list (by ingredient name)
    const newItems = items.filter(
      (item) => !existingNames.has(item.ingredient_name.toLowerCase().trim())
    );

    // Insert only new items
    if (newItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(newItems);

      if (itemsError) {
        return NextResponse.json(
          { error: `Failed to create shopping list items: ${itemsError.message}` },
          { status: 500 }
        );
      }
    }

    // Fetch the complete shopping list with items
    const { data: completeList, error: fetchError } = await supabase
      .from('shopping_lists')
      .select('*, items:shopping_list_items(*)')
      .eq('id', listId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch shopping list: ${fetchError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(completeList, { status: 201 });
  } catch (error) {
    console.error('Error generating shopping list:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to generate shopping list: ${message}` },
      { status: 500 }
    );
  }
}
