-- Seed deal categories
INSERT INTO deal_categories (name, display_name, sort_order, icon) VALUES
('produce', 'Produce', 1, 'leaf'),
('meat', 'Meat & Seafood', 2, 'beef'),
('dairy', 'Dairy & Eggs', 3, 'milk'),
('bakery', 'Bakery & Bread', 4, 'croissant'),
('frozen', 'Frozen Foods', 5, 'snowflake'),
('pantry_staples', 'Pantry Staples', 6, 'package'),
('snacks', 'Snacks & Chips', 7, 'cookie'),
('beverages', 'Beverages', 8, 'cup-soda'),
('deli', 'Deli & Prepared', 9, 'sandwich'),
('condiments', 'Condiments & Sauces', 10, 'utensils'),
('breakfast', 'Breakfast & Cereal', 11, 'egg'),
('household', 'Household & Cleaning', 12, 'spray-can'),
('personal_care', 'Personal Care', 13, 'heart-pulse'),
('other', 'Other', 99, 'package');

-- Insert default user preferences
INSERT INTO user_preferences (id, household_size)
VALUES ('00000000-0000-0000-0000-000000000001', 1);
