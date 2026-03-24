import { NextResponse } from 'next/server';
import { extractRecipeFromHTML, extractRecipeFromText } from '@/lib/claude/extract-recipe';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, text } = body as { url?: string; text?: string };

    // Mode 1: Extract from URL
    if (url) {
      // Fetch the page HTML
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MealPlanner/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
          { status: 400 }
        );
      }

      const html = await response.text();
      const recipe = await extractRecipeFromHTML(html, url);

      if (recipe.title === 'Not Found') {
        return NextResponse.json(
          { error: 'Could not find a recipe on that page. Try pasting the recipe text instead.' },
          { status: 400 }
        );
      }

      return NextResponse.json(recipe);
    }

    // Mode 2: Extract from pasted text
    if (text) {
      const recipe = await extractRecipeFromText(text);
      return NextResponse.json(recipe);
    }

    return NextResponse.json(
      { error: 'Provide either a url or text to extract a recipe from' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error extracting recipe:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to extract recipe: ${message}` },
      { status: 500 }
    );
  }
}
