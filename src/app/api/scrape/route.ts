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

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

async function fetchHtml(url: string): Promise<string> {
  // 1. Direct fetch
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const html = await res.text();
      // Make sure we got actual HTML, not a bot-challenge page
      if (html.includes('<html') && html.length > 2000) return html;
    }
  } catch {
    // fall through to proxy
  }

  // 2. AllOrigins proxy fallback (handles many sites that block server-side requests)
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
  if (!proxyRes.ok) throw new Error(`Could not fetch page (HTTP ${proxyRes.status})`);
  return proxyRes.text();
}

// Selectors for the main article body on blog-style sites
const CONTENT_SELECTORS = [
  'article', '.entry-content', '.post-content', '.recipe-content',
  'main', '.content', '#content', '.post-body',
];

function htmlFallbackParse($: ReturnType<typeof cheerio.load>, result: ScrapedData) {
  // Find main content area selector
  let contentSel = 'body';
  for (const sel of CONTENT_SELECTORS) {
    if ($(sel).length) { contentSel = sel; break; }
  }
  const $content = $(contentSel);

  // Walk headings to find ingredient/instruction sections
  const ingredientRx = /ingredient/i;
  const instructionRx = /direction|instruction|method|preparation|how to/i;

  $content.find('h1,h2,h3,h4,h5,h6').each((_, heading) => {
    const headingText = $(heading).text();
    const isIngredients = ingredientRx.test(headingText);
    const isInstructions = instructionRx.test(headingText);
    if (!isIngredients && !isInstructions) return;

    // Collect sibling text until the next heading
    const items: string[] = [];
    let node = $(heading).next();
    while (node.length && !node.is('h1,h2,h3,h4,h5,h6')) {
      // Check list items first, then paragraph text
      const lis = node.find('li');
      if (lis.length) {
        lis.each((_, li) => {
          const t = $(li).text().trim();
          if (t) items.push(t);
        });
      } else {
        // Split paragraph text by newlines / <br> tags
        node.find('br').replaceWith('\n');
        const text = node.text();
        text.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => items.push(l));
      }
      node = node.next();
    }

    const cleaned = items.filter(t => t.length > 2);
    if (isIngredients && !result.ingredients?.length) result.ingredients = cleaned;
    if (isInstructions && !result.instructions?.length) result.instructions = cleaned;
  });
}

function parseHtml(html: string): ScrapedData {
  const $ = cheerio.load(html);
  const result: ScrapedData = {};

  // 1. Try JSON-LD structured data
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
        if (yld) result.servings = (Array.isArray(yld) ? yld[0] : yld).toString();

        result.cookTime = parseIsoDuration(recipe.totalTime || recipe.cookTime || '');
      }
    } catch {
      // malformed JSON-LD, skip
    }
  });

  // 2. OG / meta fallbacks for title + image
  if (!result.image) {
    result.image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';
  }
  if (!result.title) {
    result.title =
      $('meta[property="og:title"]').attr('content') || $('title').text().split('|')[0].trim() || '';
  }

  // 3. HTML fallback for blogs without schema (e.g. pureella.com)
  if (!result.ingredients?.length && !result.instructions?.length) {
    htmlFallbackParse($, result);
  }

  return result;
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  try {
    const html = await fetchHtml(url);
    const result = parseHtml(html);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch URL' },
      { status: 400 }
    );
  }
}
