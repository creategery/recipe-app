import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { ScrapedData } from '@/types/recipe';

function parseIsoDuration(duration?: string): string {
  if (!duration) return '';
  const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return duration;
  const h = parseInt(m[1] || '0');
  const min = parseInt(m[2] || '0');
  if (h && min) return `${h}h ${min}m`;
  if (h) return `${h}h`;
  if (min) return `${min}m`;
  return duration;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findRecipe(obj: any): any {
  if (!obj) return null;
  if (obj['@type'] === 'Recipe') return obj;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipe(item);
      if (found) return found;
    }
  }
  if (typeof obj === 'object') {
    for (const val of Object.values(obj)) {
      const found = findRecipe(val);
      if (found) return found;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractInstructions(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) {
    return raw
      .flatMap(i => {
        if (typeof i === 'string') return [i];
        if (i['@type'] === 'HowToSection') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (i.itemListElement || []).map((s: any) => s.text || s.name || '');
        }
        return [i.text || i.name || ''];
      })
      .filter(Boolean);
  }
  return [];
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const result: ScrapedData = {};

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        const recipe = findRecipe(json);
        if (recipe && !result.title) {
          result.title = recipe.name;

          if (recipe.image) {
            if (typeof recipe.image === 'string') result.image = recipe.image;
            else if (Array.isArray(recipe.image)) result.image = recipe.image[0];
            else if (recipe.image?.url) result.image = recipe.image.url;
          }

          if (recipe.recipeIngredient) {
            result.ingredients = (recipe.recipeIngredient as string[]).filter(Boolean);
          }

          result.instructions = extractInstructions(recipe.recipeInstructions);

          const yld = recipe.recipeYield;
          if (yld) {
            result.servings = (Array.isArray(yld) ? yld[0] : yld).toString();
          }

          result.cookTime = parseIsoDuration(recipe.totalTime || recipe.cookTime || '');
        }
      } catch {
        // malformed JSON-LD, skip
      }
    });

    if (!result.image) {
      result.image =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '';
    }
    if (!result.title) {
      result.title =
        $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch URL' },
      { status: 400 }
    );
  }
}
