-- ============================================================
-- Migration 004: Make shopping list unit free-form text and ensure store column exists
-- ============================================================

-- Change unit column from unit_type enum to plain TEXT
-- This allows any unit like "lbs", "bags", "count", "bunch", etc.
ALTER TABLE shopping_list_items ALTER COLUMN unit TYPE TEXT;

-- Add store column if it doesn't exist (for per-item store tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'shopping_list_items' AND column_name = 'store'
    ) THEN
        ALTER TABLE shopping_list_items ADD COLUMN store TEXT;
    END IF;
END $$;
