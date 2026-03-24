-- ============================================================
-- Meal Planner App - Initial Schema
-- ============================================================

-- ENUM types
CREATE TYPE store_name AS ENUM ('frys', 'safeway');
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE unit_type AS ENUM ('oz', 'lb', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'count', 'bunch', 'bag', 'box', 'can', 'jar', 'bottle', 'pack', 'other');
CREATE TYPE pantry_location AS ENUM ('pantry', 'fridge', 'freezer');

-- ============================================================
-- User Preferences (single row for single user)
-- ============================================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dietary_restrictions TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    disliked_ingredients TEXT[] DEFAULT '{}',
    liked_ingredients TEXT[] DEFAULT '{}',
    cuisine_preferences TEXT[] DEFAULT '{}',
    max_prep_time_minutes INTEGER DEFAULT 60,
    cooking_skill_level TEXT DEFAULT 'intermediate',
    household_size INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Weekly Ads
-- ============================================================
CREATE TABLE weekly_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store store_name NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    raw_text TEXT NOT NULL,
    parsed_at TIMESTAMPTZ,
    parse_status TEXT DEFAULT 'pending',
    parse_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store, week_start)
);

-- ============================================================
-- Parsed Deals
-- ============================================================
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_ad_id UUID NOT NULL REFERENCES weekly_ads(id) ON DELETE CASCADE,
    store store_name NOT NULL,
    item_name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    sale_price NUMERIC(8,2) NOT NULL,
    regular_price NUMERIC(8,2),
    unit TEXT,
    price_per_unit NUMERIC(8,4),
    quantity_description TEXT,
    deal_type TEXT DEFAULT 'sale',
    requires_card BOOLEAN DEFAULT FALSE,
    valid_start DATE,
    valid_end DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_store ON deals(store);
CREATE INDEX idx_deals_category ON deals(category);
CREATE INDEX idx_deals_weekly_ad ON deals(weekly_ad_id);
CREATE INDEX idx_deals_item_name ON deals USING gin(to_tsvector('english', item_name));

-- ============================================================
-- Deal Categories (reference)
-- ============================================================
CREATE TABLE deal_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    icon TEXT
);

-- ============================================================
-- Pantry Items
-- ============================================================
CREATE TABLE pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC(8,2) DEFAULT 1,
    unit unit_type DEFAULT 'count',
    location pantry_location DEFAULT 'pantry',
    expiration_date DATE,
    purchase_date DATE,
    purchased_from store_name,
    notes TEXT,
    is_staple BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pantry_location ON pantry_items(location);
CREATE INDEX idx_pantry_expiration ON pantry_items(expiration_date);

-- ============================================================
-- Recipes
-- ============================================================
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spoonacular_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    source_url TEXT,
    servings INTEGER DEFAULT 4,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    cuisine TEXT,
    meal_types meal_type[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    directions JSONB NOT NULL DEFAULT '[]',
    nutrition JSONB,
    is_favorited BOOLEAN DEFAULT FALSE,
    is_user_created BOOLEAN DEFAULT FALSE,
    leftover_recipe_id UUID REFERENCES recipes(id),
    times_made INTEGER DEFAULT 0,
    last_made_at DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_spoonacular ON recipes(spoonacular_id);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_tags ON recipes USING gin(tags);

-- ============================================================
-- Recipe Ingredients
-- ============================================================
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    quantity NUMERIC(8,2),
    unit unit_type,
    preparation TEXT,
    is_optional BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- ============================================================
-- Meal Plans
-- ============================================================
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    store_preference store_name,
    num_meals INTEGER DEFAULT 14,
    num_people INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_plans_week ON meal_plans(week_start);

-- ============================================================
-- Meal Plan Entries
-- ============================================================
CREATE TABLE meal_plan_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    day day_of_week NOT NULL,
    meal_type meal_type NOT NULL,
    recipe_id UUID REFERENCES recipes(id),
    custom_meal_name TEXT,
    servings INTEGER DEFAULT 1,
    is_leftover BOOLEAN DEFAULT FALSE,
    leftover_source_id UUID REFERENCES meal_plan_entries(id),
    prep_notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_plan_entries_plan ON meal_plan_entries(meal_plan_id);
CREATE INDEX idx_meal_plan_entries_recipe ON meal_plan_entries(recipe_id);

-- ============================================================
-- Shopping Lists
-- ============================================================
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID REFERENCES meal_plans(id),
    week_start DATE NOT NULL,
    store store_name,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Shopping List Items
-- ============================================================
CREATE TABLE shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    quantity NUMERIC(8,2),
    unit unit_type,
    category TEXT,
    estimated_price NUMERIC(8,2),
    deal_id UUID REFERENCES deals(id),
    is_checked BOOLEAN DEFAULT FALSE,
    is_owned BOOLEAN DEFAULT FALSE,
    added_manually BOOLEAN DEFAULT FALSE,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopping_list_items_list ON shopping_list_items(shopping_list_id);

-- ============================================================
-- Purchase History
-- ============================================================
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store store_name NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount NUMERIC(8,2),
    shopping_list_id UUID REFERENCES shopping_lists(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity NUMERIC(8,2) DEFAULT 1,
    unit unit_type DEFAULT 'count',
    price NUMERIC(8,2),
    category TEXT,
    was_on_sale BOOLEAN DEFAULT FALSE,
    deal_id UUID REFERENCES deals(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_store ON purchases(store);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);

-- ============================================================
-- Meal Prep Guides
-- ============================================================
CREATE TABLE meal_prep_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    prep_date DATE NOT NULL,
    total_time_estimate INTEGER,
    guide_content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Reminders
-- ============================================================
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Spoonacular Cache
-- ============================================================
CREATE TABLE spoonacular_cache (
    cache_key TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_cache_expires ON spoonacular_cache(expires_at);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_preferences_updated
    BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pantry_items_updated
    BEFORE UPDATE ON pantry_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_recipes_updated
    BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_meal_plans_updated
    BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shopping_lists_updated
    BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
