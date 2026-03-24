-- ============================================================
-- Migration 003: Simplify Schema
-- Remove ad scanning, Spoonacular, and excess tables
-- ============================================================

-- Step 1: Remove foreign key from deals to weekly_ads, drop the column
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_weekly_ad_id_fkey;
ALTER TABLE deals DROP COLUMN IF EXISTS weekly_ad_id;

-- Step 2: Add week_start and week_end directly to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS week_end DATE;

-- Step 3: Drop removed tables
DROP TABLE IF EXISTS meal_prep_guides CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS spoonacular_cache CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS weekly_ads CASCADE;
DROP TABLE IF EXISTS deal_categories CASCADE;

-- Step 4: Remove spoonacular_id from recipes (optional, keep column but it won't be used)
-- We leave the column to avoid breaking existing data, it just won't be populated going forward.
