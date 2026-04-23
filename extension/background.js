const APP_URL = 'https://recipe-app-seven-pied-95.vercel.app';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-recipe',
    title: 'Save recipe to Recipease',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-recipe') {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: extractAndOpenRecipease,
      args: [APP_URL]
    });
  }
});

// Runs in the page's MAIN world at click time — has full access to dynamic DOM
function extractAndOpenRecipease(appUrl) {
  function findRecipe(obj) {
    if (!obj) return null;
    var type = obj['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return obj;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) { var f = findRecipe(obj[i]); if (f) return f; }
    }
    if (typeof obj === 'object') {
      var vals = Object.values(obj);
      for (var i = 0; i < vals.length; i++) { var f = findRecipe(vals[i]); if (f) return f; }
    }
    return null;
  }

  function parseDuration(d) {
    if (!d) return '';
    var m = d.match(/T(?:(\d+)H)?(?:(\d+)M)?/);
    if (!m) return d;
    var h = parseInt(m[1] || '0'), min = parseInt(m[2] || '0');
    return h && min ? h + 'h ' + min + 'm' : h ? h + 'h' : min ? min + 'm' : d;
  }

  var recipe = null;
  document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s) {
    if (recipe) return;
    try { recipe = findRecipe(JSON.parse(s.textContent)); } catch(e) {}
  });

  var data = { sourceUrl: location.href, title: '', image: '', ingredients: [], instructions: [], servings: '', cookTime: '' };

  if (recipe) {
    data.title = recipe.name || '';
    var img = recipe.image;
    if (img) {
      if (typeof img === 'string') data.image = img;
      else if (Array.isArray(img)) { var fi = img[0]; data.image = typeof fi === 'string' ? fi : (fi && (fi.url || fi.contentUrl) || ''); }
      else data.image = img.url || img.contentUrl || '';
    }
    if (!data.image) {
      var og = document.querySelector('meta[property="og:image"]');
      if (og) data.image = og.getAttribute('content') || '';
    }
    data.ingredients = recipe.recipeIngredient || [];
    var raw = recipe.recipeInstructions || [];
    data.instructions = (typeof raw === 'string' ? [raw] : raw.flatMap(function(i) {
      if (typeof i === 'string') return [i];
      if (i['@type'] === 'HowToSection') return (i.itemListElement || []).map(function(s) { return s.text || s.name || ''; });
      return [i.text || i.name || ''];
    })).filter(Boolean);
    var y = recipe.recipeYield; if (y) data.servings = (Array.isArray(y) ? y[0] : y) + '';
    data.cookTime = parseDuration(recipe.totalTime || recipe.cookTime || '');
  } else {
    data.title = document.title.split('|')[0].split(' - ')[0].trim();
    var ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) data.image = ogImg.getAttribute('content') || '';
  }

  if (data.title || data.ingredients.length > 0) {
    var encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
    window.open(appUrl + '/save?data=' + encoded);
  } else {
    alert('No recipe data found on this page.\n\nTry the paste option in Recipease instead.');
  }
}
