import { getClaudeClient } from './client';

export interface ExtractedRecipe {
  title: string;
  description: string | null;
  image_url: string | null;
  source_url: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  cuisine: string | null;
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    preparation: string | null;
  }[];
  directions: { step: number; text: string }[];
}

export async function extractRecipeFromHTML(
  html: string,
  sourceUrl: string
): Promise<ExtractedRecipe> {
  const client = getClaudeClient();

  // Truncate HTML to avoid excessive token usage
  const truncatedHtml = html.slice(0, 30000);

  const systemPrompt = `You are a recipe extraction assistant. Given the HTML content of a recipe webpage, extract the recipe into structured JSON.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "title": "string",
  "description": "string or null",
  "image_url": "string URL or null",
  "servings": number or null,
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "cuisine": "string or null (e.g. Italian, Mexican, Asian, American)",
  "ingredients": [
    {
      "name": "ingredient name (no quantity/unit)",
      "quantity": number or null,
      "unit": "string or null (oz, lb, cup, tbsp, tsp, count, etc.)",
      "preparation": "string or null (e.g. diced, minced, sliced)"
    }
  ],
  "directions": [
    { "step": 1, "text": "step description" }
  ]
}

Rules:
- Extract the ACTUAL recipe, not ads or related recipes
- Parse ingredient strings into separate name/quantity/unit/preparation fields
- For quantities like "1/2", convert to decimal (0.5)
- For "a pinch of salt", use quantity: null, unit: null
- Directions should be clean text without numbering prefixes
- Look for og:image or recipe schema image for image_url
- If multiple recipes on the page, extract the primary/first one
- If you can't find a recipe, return a JSON object with title: "Not Found" and empty arrays`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this webpage (source: ${sourceUrl}):\n\n${truncatedHtml}`,
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

  const extracted = JSON.parse(jsonText);

  return {
    title: extracted.title || 'Untitled Recipe',
    description: extracted.description || null,
    image_url: extracted.image_url || null,
    source_url: sourceUrl,
    servings: extracted.servings || null,
    prep_time_minutes: extracted.prep_time_minutes || null,
    cook_time_minutes: extracted.cook_time_minutes || null,
    cuisine: extracted.cuisine || null,
    ingredients: Array.isArray(extracted.ingredients) ? extracted.ingredients : [],
    directions: Array.isArray(extracted.directions) ? extracted.directions : [],
  };
}

export async function extractRecipeFromText(
  text: string
): Promise<ExtractedRecipe> {
  const client = getClaudeClient();

  const systemPrompt = `You are a recipe extraction assistant. Given pasted recipe text, extract it into structured JSON.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "title": "string",
  "description": "string or null",
  "servings": number or null,
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "cuisine": "string or null",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": number or null,
      "unit": "string or null",
      "preparation": "string or null"
    }
  ],
  "directions": [
    { "step": 1, "text": "step description" }
  ]
}

Rules:
- Parse ingredient lines into separate name/quantity/unit/preparation
- Convert fractions to decimals (1/2 = 0.5, 1/4 = 0.25)
- Directions should be clean steps without numbering prefixes
- Infer cuisine from ingredients/techniques if possible`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this text:\n\n${text.slice(0, 10000)}`,
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

  const extracted = JSON.parse(jsonText);

  return {
    title: extracted.title || 'Untitled Recipe',
    description: extracted.description || null,
    image_url: null,
    source_url: '',
    servings: extracted.servings || null,
    prep_time_minutes: extracted.prep_time_minutes || null,
    cook_time_minutes: extracted.cook_time_minutes || null,
    cuisine: extracted.cuisine || null,
    ingredients: Array.isArray(extracted.ingredients) ? extracted.ingredients : [],
    directions: Array.isArray(extracted.directions) ? extracted.directions : [],
  };
}
