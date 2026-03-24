export const APP_NAME = 'Meal Planner';

export const CATEGORY_DISPLAY: Record<string, { label: string; icon: string }> = {
  produce: { label: 'Produce', icon: 'Leaf' },
  meat: { label: 'Meat & Seafood', icon: 'Beef' },
  dairy: { label: 'Dairy & Eggs', icon: 'Milk' },
  bakery: { label: 'Bakery & Bread', icon: 'Croissant' },
  frozen: { label: 'Frozen Foods', icon: 'Snowflake' },
  pantry_staples: { label: 'Pantry Staples', icon: 'Package' },
  snacks: { label: 'Snacks & Chips', icon: 'Cookie' },
  beverages: { label: 'Beverages', icon: 'CupSoda' },
  deli: { label: 'Deli & Prepared', icon: 'Sandwich' },
  condiments: { label: 'Condiments & Sauces', icon: 'Utensils' },
  breakfast: { label: 'Breakfast & Cereal', icon: 'Egg' },
  household: { label: 'Household & Cleaning', icon: 'SprayCan' },
  personal_care: { label: 'Personal Care', icon: 'HeartPulse' },
  other: { label: 'Other', icon: 'Package' },
};

export const AISLE_ORDER = [
  'produce', 'meat', 'dairy', 'bakery', 'deli', 'frozen',
  'pantry_staples', 'condiments', 'breakfast', 'snacks',
  'beverages', 'household', 'personal_care', 'other'
];
