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
    // Execute function in the page context to get the extracted recipe data
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Re-extract at click time in case JSON-LD loaded dynamically after page load
        const recipe = window.__extractRecipeData ? window.__extractRecipeData() : window.__recipeData;
        if (recipe && (recipe.title || recipe.ingredients.length > 0)) {
          chrome.runtime.sendMessage({
            action: 'openSavePage',
            recipe: recipe
          });
        } else {
          alert('No recipe data found on this page.\n\nTry the paste option in Recipease instead.');
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSavePage') {
    const recipe = request.recipe;
    const encoded = encodeURIComponent(
      btoa(unescape(encodeURIComponent(JSON.stringify(recipe))))
    );
    const saveUrl = `${APP_URL}/save?data=${encoded}`;
    chrome.tabs.create({ url: saveUrl });
  }
});
