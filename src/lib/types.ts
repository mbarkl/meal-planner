export type StoreName = 'frys' | 'safeway';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type UnitType = 'oz' | 'lb' | 'g' | 'kg' | 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp' | 'count' | 'bunch' | 'bag' | 'box' | 'can' | 'jar' | 'bottle' | 'pack' | 'other';
export type PantryLocation = 'pantry' | 'fridge' | 'freezer';

export interface UserPreferences {
  id: string;
  dietary_restrictions: string[];
  allergies: string[];
  disliked_ingredients: string[];
  liked_ingredients: string[];
  cuisine_preferences: string[];
  max_prep_time_minutes: number;
  cooking_skill_level: string;
  household_size: number;
  notes: string | null;
}

export interface Deal {
  id: string;
  store: StoreName;
  item_name: string;
  brand: string | null;
  category: string;
  subcategory: string | null;
  sale_price: number;
  regular_price: number | null;
  unit: string | null;
  price_per_unit: number | null;
  quantity_description: string | null;
  deal_type: string;
  requires_card: boolean;
  valid_start: string | null;
  valid_end: string | null;
  notes: string | null;
  week_start: string | null;
  week_end: string | null;
  created_at: string;
}

export interface PantryItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: UnitType;
  location: PantryLocation;
  expiration_date: string | null;
  purchase_date: string | null;
  purchased_from: StoreName | null;
  notes: string | null;
  is_staple: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  cuisine: string | null;
  meal_types: MealType[];
  tags: string[];
  directions: { step: number; text: string }[];
  nutrition: { calories?: number; protein?: number; carbs?: number; fat?: number } | null;
  is_favorited: boolean;
  is_user_created: boolean;
  leftover_recipe_id: string | null;
  times_made: number;
  last_made_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: UnitType | null;
  preparation: string | null;
  is_optional: boolean;
  sort_order: number;
}

export interface MealPlan {
  id: string;
  week_start: string;
  store_preference: StoreName | null;
  num_meals: number;
  num_people: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  entries?: MealPlanEntry[];
}

export interface MealPlanEntry {
  id: string;
  meal_plan_id: string;
  day: DayOfWeek;
  meal_type: MealType;
  recipe_id: string | null;
  custom_meal_name: string | null;
  servings: number;
  is_leftover: boolean;
  leftover_source_id: string | null;
  prep_notes: string | null;
  sort_order: number;
  recipe?: Recipe;
}

export interface ShoppingList {
  id: string;
  meal_plan_id: string | null;
  week_start: string;
  store: StoreName | null;
  status: string;
  created_at: string;
  updated_at: string;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: UnitType | null;
  category: string | null;
  estimated_price: number | null;
  deal_id: string | null;
  is_checked: boolean;
  is_owned: boolean;
  added_manually: boolean;
  notes: string | null;
  sort_order: number;
  store: string | null;
}

export interface Purchase {
  id: string;
  store: StoreName;
  purchase_date: string;
  total_amount: number | null;
  shopping_list_id: string | null;
  notes: string | null;
  created_at: string;
}

export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const STORES: { value: StoreName; label: string }[] = [
  { value: 'frys', label: "Fry's" },
  { value: 'safeway', label: 'Safeway' },
];
