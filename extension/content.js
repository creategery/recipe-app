function findRecipe(obj) {
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
      else if (Array.isArray(img)) data.image = img[0];
      else if (img.url) data.image = img.url;
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
      const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
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

// Extract recipe data on page load
window.__recipeData = extractRecipeData();
