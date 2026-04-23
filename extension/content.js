function findRecipe(obj) {
  if (!obj) return null;
  const type = obj['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return obj;
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

function extractRecipeData() {
  let recipe = null;
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent);
      recipe = findRecipe(json);
      if (recipe) break;
    } catch (e) {
      // skip malformed JSON
    }
  }

  const data = {
    sourceUrl: window.location.href,
    title: '',
    image: '',
    ingredients: [],
    instructions: [],
    servings: '',
    cookTime: ''
  };

  if (recipe) {
    data.title = recipe.name || '';

    const img = recipe.image;
    if (img) {
      if (typeof img === 'string') data.image = img;
      else if (Array.isArray(img)) {
        const first = img[0];
        data.image = typeof first === 'string' ? first : (first?.url || first?.contentUrl || '');
      } else {
        data.image = img.url || img.contentUrl || '';
      }
    }
    // Also try og:image as fallback
    if (!data.image) {
      const og = document.querySelector('meta[property="og:image"]');
      if (og) data.image = og.getAttribute('content') || '';
    }

    data.ingredients = recipe.recipeIngredient || [];

    const raw = recipe.recipeInstructions || [];
    if (typeof raw === 'string') {
      data.instructions = [raw];
    } else if (Array.isArray(raw)) {
      data.instructions = raw
        .flatMap(i => {
          if (typeof i === 'string') return [i];
          if (i['@type'] === 'HowToSection') {
            return (i.itemListElement || []).map(s => s.text || s.name || '');
          }
          return [i.text || i.name || ''];
        })
        .filter(Boolean);
    }

    const yld = recipe.recipeYield;
    if (yld) data.servings = (Array.isArray(yld) ? yld[0] : yld).toString();

    const duration = recipe.totalTime || recipe.cookTime || '';
    if (duration) {
      const m = duration.match(/T(?:(\d+)H)?(?:(\d+)M)?/);
      if (m) {
        const h = parseInt(m[1] || '0');
        const min = parseInt(m[2] || '0');
        if (h && min) data.cookTime = `${h}h ${min}m`;
        else if (h) data.cookTime = `${h}h`;
        else if (min) data.cookTime = `${min}m`;
        else data.cookTime = duration;
      } else {
        data.cookTime = duration;
      }
    }
  } else {
    // Fallback: get title and og:image
    data.title = document.title.split('|')[0].split(' - ')[0].trim();
    const og = document.querySelector('meta[property="og:image"]');
    if (og) data.image = og.getAttribute('content') || '';
  }

  return data;
}

// Extract at page load, but expose the function so background can re-run it at click time
window.__recipeData = extractRecipeData();
window.__extractRecipeData = extractRecipeData;
