import { getClaudeClient } from './client';
import type {
  Deal,
  PantryItem,
  UserPreferences,
  Recipe,
  StoreName,
  MealType,
  DayOfWeek,
} from '@/lib/types';

export interface GeneratedMeal {
  day: DayOfWeek;
  meal_type: MealType;
  recipe_title: string;
  recipe_id: string | null;
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    preparation: string | null;
  }[];
  directions: { step: number; text: string }[];
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  is_leftover: boolean;
  leftover_source: string | null;
  prep_notes: string | null;
}

export interface GenerateMealPlanParams {
  deals: Deal[];
  pantryItems: PantryItem[];
  preferences: UserPreferences;
  savedRecipes: Recipe[];
  numMeals: number;
  numPeople: number;
  storePref: StoreName | null;
}

export async function generateMealPlan(
  params: GenerateMealPlanParams
): Promise<GeneratedMeal[]> {
  const { deals, pantryItems, preferences, savedRecipes, numMeals, numPeople, storePref } =
    params;
  const client = getClaudeClient();

  const storeName = storePref === 'frys'
    ? "Fry's"
    : storePref === 'safeway'
      ? 'Safeway'
      : 'either store';

  // Build the cookbook list
  const cookbookList = savedRecipes.length > 0
    ? savedRecipes
        .map((r) => {
          const time = r.total_time_minutes || ((r.prep_time_minutes || 0) + (r.cook_time_minutes || 0));
          const timeStr = time > 0 ? ` (${time} min)` : '';
          const cuisine = r.cuisine ? ` [${r.cuisine}]` : '';
          const ings = r.ingredients
            ? r.ingredients.map((i) => i.ingredient_name).join(', ')
            : 'no ingredients listed';
          return `- ID: ${r.id} | "${r.title}"${cuisine}${timeStr}\n  Ingredients: ${ings}`;
        })
        .join('\n')
    : 'NO RECIPES IN COOKBOOK. Cannot generate a meal plan.';

  if (savedRecipes.length === 0) {
    throw new Error('No recipes in your cookbook. Add some recipes first before generating a meal plan.');
  }

  const systemPrompt = `You are a meal planning assistant. The user has a personal cookbook of saved recipes. Your job is to SELECT recipes from their cookbook and schedule them into a weekly meal plan.

CRITICAL RULES:
1. You must ONLY use recipes from the user's cookbook below. Do NOT invent new recipes.
2. Each meal must reference an exact recipe_id and recipe_title from the cookbook.
3. You may schedule the same recipe multiple times if needed.
4. For leftover meals, reference the original recipe and set is_leftover: true.
5. Consider sale items — prefer recipes whose ingredients match current deals.
6. Use expiring pantry items — prefer recipes that use those ingredients.
7. Respect dietary restrictions, allergies, and dislikes.
8. Vary the meals — avoid scheduling the same recipe on consecutive days.

Return ONLY a JSON array. No markdown, no explanation.

Each object must have:
{
  "day": "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "recipe_title": "exact title from cookbook",
  "recipe_id": "exact ID from cookbook",
  "ingredients": [copy from cookbook recipe],
  "directions": [copy from cookbook recipe],
  "servings": number (adjusted for numPeople),
  "prep_time": number or null,
  "cook_time": number or null,
  "is_leftover": boolean,
  "leftover_source": "recipe title" or null,
  "prep_notes": "string" or null
}

For leftover meals:
- Set is_leftover: true
- Set leftover_source to the original recipe title
- Set ingredients to [] (no new ingredients needed)
- Set directions to [{"step": 1, "text": "Reheat leftover [recipe] from [day]"}]
- Add a prep_note like "Use leftover from Monday's dinner"`;

  // Build context
  const saleItemsList = deals.length > 0
    ? deals
        .map((d) => {
          const price = `$${d.sale_price.toFixed(2)}`;
          const reg = d.regular_price ? ` (reg $${d.regular_price.toFixed(2)})` : '';
          return `- ${d.item_name}: ${price}${reg} [${d.category}]`;
        })
        .join('\n')
    : 'No current sale items.';

  const pantryList = pantryItems.length > 0
    ? pantryItems
        .map((p) => {
          const exp = p.expiration_date ? ` (expires: ${p.expiration_date})` : '';
          return `- ${p.name}: ${p.quantity} ${p.unit} [${p.location}]${exp}`;
        })
        .join('\n')
    : 'No pantry items tracked.';

  const dietaryInfo = [
    preferences.dietary_restrictions.length > 0
      ? `Dietary restrictions: ${preferences.dietary_restrictions.join(', ')}`
      : null,
    preferences.allergies.length > 0
      ? `Allergies: ${preferences.allergies.join(', ')}`
      : null,
    preferences.disliked_ingredients.length > 0
      ? `Dislikes: ${preferences.disliked_ingredients.join(', ')}`
      : null,
    preferences.liked_ingredients.length > 0
      ? `Likes: ${preferences.liked_ingredients.join(', ')}`
      : null,
    preferences.cuisine_preferences.length > 0
      ? `Cuisine preferences: ${preferences.cuisine_preferences.join(', ')}`
      : null,
    `Max prep time: ${preferences.max_prep_time_minutes} minutes`,
    `Cooking skill level: ${preferences.cooking_skill_level}`,
    preferences.notes ? `Additional notes: ${preferences.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const userMessage = `Create a meal plan using ONLY recipes from my cookbook.

STORE PREFERENCE: ${storeName}
NUMBER OF MEALS: ${numMeals}
NUMBER OF PEOPLE: ${numPeople}

MY COOKBOOK (select from these only):
${cookbookList}

AVAILABLE SALE ITEMS (prefer recipes using these):
${saleItemsList}

PANTRY ITEMS (prefer recipes using expiring items):
${pantryList}

PREFERENCES:
${dietaryInfo}

Select ${numMeals} meals from my cookbook, distributed across the week. Prefer recipes whose ingredients match the sale items. Plan leftovers strategically.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 12000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let jsonText = textContent.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const meals: GeneratedMeal[] = JSON.parse(jsonText);
  return meals;
}
