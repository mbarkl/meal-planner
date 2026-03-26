// Auto-categorize ingredients by name into grocery aisle categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: [
    'apple', 'avocado', 'banana', 'basil', 'bell pepper', 'berry', 'blueberr',
    'broccoli', 'cabbage', 'carrot', 'celery', 'cilantro', 'corn', 'cucumber',
    'dill', 'eggplant', 'fruit', 'garlic', 'ginger', 'grape', 'green bean',
    'green onion', 'herb', 'jalape', 'kale', 'lemon', 'lettuce', 'lime',
    'mango', 'melon', 'mint', 'mushroom', 'onion', 'orange', 'parsley',
    'peach', 'pear', 'pepper', 'pineapple', 'potato', 'radish', 'rosemary',
    'salad', 'scallion', 'shallot', 'spinach', 'squash', 'strawberr',
    'sweet potato', 'thyme', 'tomato', 'watermelon', 'zucchini', 'arugula',
    'asparagus', 'bok choy', 'brussels', 'cauliflower', 'chive', 'collard',
    'fennel', 'leek', 'okra', 'parsnip', 'pea', 'plantain', 'pomegranate',
    'turnip', 'yam', 'artichoke',
  ],
  meat: [
    'bacon', 'beef', 'brisket', 'chicken', 'chorizo', 'duck', 'ground beef',
    'ground turkey', 'ham', 'hot dog', 'lamb', 'meatball', 'pork', 'prosciutto',
    'rib', 'salami', 'sausage', 'steak', 'turkey', 'veal', 'venison',
    'fish', 'salmon', 'shrimp', 'tilapia', 'tuna', 'cod', 'crab', 'lobster',
    'scallop', 'clam', 'mussel', 'anchov', 'catfish', 'halibut', 'mahi',
    'trout', 'sardine', 'seafood',
  ],
  dairy: [
    'butter', 'cheese', 'cheddar', 'colby', 'cottage cheese', 'cream cheese',
    'cream', 'egg', 'feta', 'gouda', 'greek yogurt', 'half and half',
    'heavy cream', 'milk', 'mozzarella', 'parmesan', 'provolone',
    'ricotta', 'sour cream', 'swiss', 'whipped cream', 'yogurt',
    'boursin', 'brie', 'goat cheese', 'mascarpone', 'queso',
  ],
  bakery: [
    'bagel', 'baguette', 'bread', 'brioche', 'bun', 'cake', 'ciabatta',
    'cookie', 'cornbread', 'croissant', 'donut', 'english muffin',
    'flatbread', 'focaccia', 'muffin', 'naan', 'pie crust', 'pita',
    'roll', 'sourdough', 'tortilla', 'wrap',
  ],
  frozen: [
    'frozen', 'ice cream', 'popsicle', 'frozen pizza', 'frozen fruit',
    'frozen vegetable', 'frozen dinner', 'frozen waffle',
  ],
  pantry_staples: [
    'baking powder', 'baking soda', 'bouillon', 'broth', 'brown sugar',
    'canned', 'chickpea', 'coconut milk', 'cornstarch', 'couscous',
    'dried', 'flour', 'honey', 'lentil', 'maple syrup', 'noodle',
    'oat', 'olive oil', 'oil', 'orzo', 'pasta', 'peanut butter',
    'quinoa', 'rice', 'spaghetti', 'stock', 'sugar', 'tomato paste',
    'tomato sauce', 'vegetable broth', 'vinegar', 'bean', 'white bean',
    'black bean', 'kidney bean', 'pinto bean',
  ],
  condiments: [
    'bbq sauce', 'dijon', 'dressing', 'hot sauce', 'ketchup', 'mayo',
    'mayonnaise', 'mustard', 'pesto', 'relish', 'salsa', 'soy sauce',
    'sriracha', 'tahini', 'teriyaki', 'vinaigrette', 'worcestershire',
    'fish sauce', 'hoisin', 'oyster sauce', 'chili sauce',
  ],
  snacks: [
    'almond', 'cashew', 'chip', 'cracker', 'dried fruit', 'granola',
    'nut', 'pecan', 'pistachio', 'popcorn', 'pretzel', 'pumpkin seed',
    'seed', 'snack', 'sunflower', 'trail mix', 'walnut',
  ],
  beverages: [
    'beer', 'club soda', 'coconut water', 'coffee', 'juice', 'kombucha',
    'lemonade', 'soda', 'sparkling', 'tea', 'water', 'wine',
  ],
  breakfast: [
    'cereal', 'granola bar', 'oatmeal', 'pancake', 'syrup', 'waffle',
    'jam', 'jelly', 'preserves',
  ],
  deli: [
    'deli', 'hummus', 'olive', 'pickle', 'prepared', 'rotisserie',
    'sub', 'wrap',
  ],
  household: [
    'aluminum foil', 'bag', 'bleach', 'cleaner', 'detergent', 'dish soap',
    'garbage', 'paper towel', 'plastic wrap', 'sponge', 'tissue',
    'trash bag', 'wipe', 'laundry',
  ],
  personal_care: [
    'body wash', 'conditioner', 'deodorant', 'floss', 'lotion', 'razor',
    'shampoo', 'soap', 'sunscreen', 'toothbrush', 'toothpaste',
  ],
};

// Spice/seasoning keywords → pantry_staples
const SPICE_KEYWORDS = [
  'basil', 'bay leaf', 'black pepper', 'cayenne', 'chili flake', 'chili powder',
  'cinnamon', 'clove', 'coriander', 'cumin', 'curry', 'dill', 'garlic powder',
  'ginger', 'italian seasoning', 'nutmeg', 'onion powder', 'oregano', 'paprika',
  'parsley', 'pepper', 'red pepper', 'rosemary', 'sage', 'salt', 'seasoning',
  'smoked paprika', 'thyme', 'turmeric', 'vanilla',
];

export function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase().trim();

  // Check spices first (they often match produce keywords like "basil")
  for (const spice of SPICE_KEYWORDS) {
    if (lower.includes(spice) && (lower.includes('dried') || lower.includes('ground') || lower.includes('powder') || lower.includes('seasoning') || lower.includes('flake') || lower === spice)) {
      return 'pantry_staples';
    }
  }

  // Check each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }

  return 'other';
}
