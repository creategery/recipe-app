# Recipease Browser Extension

Save recipes from any website to Recipease with a single right-click.

## Installation (Local / Unpacked)

1. Open your browser and go to `chrome://extensions` (works in Chrome, Edge, Arc, and Chromium-based browsers)
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Navigate to this `extension` folder and select it
5. Done! The extension is now installed

## How to use

1. Visit any recipe website (Food Network, NYT Cooking, Serious Eats, etc.)
2. Right-click anywhere on the page
3. Select **"Save recipe to Recipease"**
4. The recipe opens in Recipease pre-filled with:
   - Title, image, ingredients, instructions
   - Cook time and servings (if available)
   - Source URL
5. Review/edit as needed and save

## How it works

- Extracts **JSON-LD recipe schema** from the page (same structured data our web scraper uses)
- Runs in your browser, so bot-blocking doesn't apply
- Works on any recipe site with schema markup
- Falls back to page title + OG image if no recipe schema found

## Limitations

- Only works if the page has JSON-LD recipe schema
- For paywalled sites or sites without schema, use the **paste option** in Recipease instead

## Updating the app URL

If the app URL changes, edit `background.js` line 1 and replace the URL.
