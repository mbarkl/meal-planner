import { getClaudeClient } from './client';
import type {
  Deal,
  PantryItem,
  UserPreferences,
  StoreName,
  MealType,
  DayOfWeek,
} from '@/lib/types';

export interface GeneratedMeal {
  day: DayOfWeek;
  meal_type: MealType;
  recipe_title: string;
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
  numMeals: number;
  numPeople: number;
  storePref: StoreName | null;
}

export async function generateMealPlan(
  params: GenerateMealPlanParams
): Promise<GeneratedMeal[]> {
  const { deals, pantryItems, preferences, numMeals, numPeople, storePref } =
    params;
  const client = getClaudeClient();

  const storeName = storePref === 'frys'
    ? "Fry's"
    : storePref === 'safeway'
      ? 'Safeway'
      : 'either store';

  const systemPrompt = `You are an expert meal planning assistant. Your goal is to create a practical, budget-friendly weekly meal plan that:

1. PRIORITIZES using sale items from the grocery store to maximize savings
2. Uses pantry items that are expiring soon before they go bad
3. Respects all dietary restrictions, allergies, and dislikes
4. Plans leftover reuse strategically (e.g., cook extra chicken on Monday to use in Wednesday's stir-fry)
5. Suggests which nights to make extra portions for later meals
6. Considers cooking skill level and time constraints
7. Creates balanced, varied meals across the week

Return ONLY a JSON array of meal objects. No markdown, no explanation, no wrapping. Just the raw JSON array.

Each meal object must have this exact structure:
{
  "day": "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "recipe_title": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": number or null,
      "unit": "string" or null,
      "preparation": "string" or null
    }
  ],
  "directions": [
    { "step": 1, "text": "step description" }
  ],
  "servings": number,
  "prep_time": number or null (minutes),
  "cook_time": number or null (minutes),
  "is_leftover": boolean,
  "leftover_source": "recipe title this is leftover from" or null,
  "prep_notes": "string" or null
}

Rules:
- For leftover meals, set is_leftover to true and reference the source recipe title in leftover_source
- When a meal reuses leftovers, its ingredients list should only include NEW ingredients needed (not the leftover base)
- For leftover meals, include a prep_note like "Use leftover [dish] from [day]"
- Ingredient quantities should be for the specified number of people
- Include practical, clear step-by-step directions
- Keep prep times realistic for the skill level`;

  // Build the user message with all context
  const saleItemsList = deals.length > 0
    ? deals
        .map((d) => {
          const price = `$${d.sale_price.toFixed(2)}`;
          const reg = d.regular_price ? ` (reg $${d.regular_price.toFixed(2)})` : '';
          const unit = d.unit ? ` / ${d.unit}` : '';
          return `- ${d.item_name}${d.brand ? ` (${d.brand})` : ''}: ${price}${unit}${reg} [${d.category}]`;
        })
        .join('\n')
    : 'No current sale items available.';

  const pantryList = pantryItems.length > 0
    ? pantryItems
        .map((p) => {
          const exp = p.expiration_date
            ? ` (expires: ${p.expiration_date})`
            : '';
          const loc = ` [${p.location}]`;
          return `- ${p.name}: ${p.quantity} ${p.unit}${loc}${exp}`;
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

  const userMessage = `Please create a meal plan with the following details:

STORE PREFERENCE: ${storeName}
NUMBER OF MEALS: ${numMeals}
NUMBER OF PEOPLE: ${numPeople}

AVAILABLE SALE ITEMS:
${saleItemsList}

PANTRY ITEMS (use expiring items first):
${pantryList}

PREFERENCES:
${dietaryInfo}

Generate exactly ${numMeals} meals distributed across the week. Prioritize using the sale items and expiring pantry items. Plan strategically so that cooking extra on some meals provides leftovers for others.`;

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

  // Extract JSON from the response (handle possible markdown wrapping)
  let jsonText = textContent.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const meals: GeneratedMeal[] = JSON.parse(jsonText);
  return meals;
}
