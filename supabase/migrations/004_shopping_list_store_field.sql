-- Add a free-text store column to shopping_list_items
-- This allows any store name (not restricted to the store_name enum)
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS store TEXT;
