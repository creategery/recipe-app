'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Recipe, RecipeFormData, ScrapedData } from '@/types/recipe';

// Stop parsing when we hit these sections
const STOP_SECTIONS = /^(nutrition facts?|nutrition info|reviews?|ratings?|comments?|community|ask the|related recipes?|you (may|might) also|more recipes?|about (this|the) recipe|did you (make|try)|how did it turn out|advertisement|similar recipes?|popular recipes?|most.saved|you.ll also love|most helpful|my private notes?|looking for something|what.s cooking|shop with us|subscribe to our|related pages)/i;

// Lines to skip entirely regardless of mode
const JUNK_LINE = /(home cooks? made it|dotdash|meredith food studio|allrecipes|food network|serious eats|show full|nutrition label|\d+ rating|\d+ review|jump to|print recipe|save recipe|pin recipe|keep screen awake|submitted by|updated on|get the magazine|why you.ll love|read more|i made it|add photo|deselect all|get ingredients|add to cart|watch how to make|replay video|please refresh|continue to have issues)/i;

// Single ALL-CAPS words that are UI elements (e.g. "WATCH")
const ALL_CAPS_WORD = /^[A-Z]{2,10}$/;

// Image captions and UI blurbs
const IMAGE_CAPTION = /^(A |An )[A-Z]|^Ingredients to |^Original recipe|as seen on/i;

// Lines that are clearly not ingredients when in ingredient mode
const NON_INGREDIENT = /^(deselect|get ingredients|add to|watch|prev |next |home |recipes?$|shows?$|chefs?$)/i;

function parseRecipeText(raw: string): Partial<RecipeFormData & { ingredientTexts: string[], parsedNotes: string }> {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const ingredientRx = /^(ingredients?|what you.?ll need|you.?ll need):?$/i;
  const instructionRx = /^(instructions?|directions?|method|preparation|how to (make|cook)|steps?):?$/i;
  const noteRx = /^(cook.?s? notes?|note|tips?|chef.?s? notes?):?$/i;
  const timeRx = /^(total time|cook time|prep time|time):?\s*(.+)/i;
  const servingRx = /^(yield|serves?|servings?|makes?):?\s*(.+)/i;

  let title = '';
  let ingredientTexts: string[] = [];
  let instructions: string[] = [];
  let notes: string[] = [];
  let cookTime = '';
  let servings = '';
  let mode: 'unknown' | 'ingredients' | 'instructions' | 'notes' = 'unknown';
  let titleSet = false;

  for (const line of lines) {
    if (STOP_SECTIONS.test(line)) break;
    if (JUNK_LINE.test(line)) continue;

    const timeM = line.match(timeRx);
    if (timeM && !cookTime) { cookTime = timeM[2].trim(); continue; }
    const servM = line.match(servingRx);
    if (servM && !servings) { servings = servM[2].trim(); continue; }
    if (ingredientRx.test(line)) { mode = 'ingredients'; continue; }
    if (instructionRx.test(line)) { mode = 'instructions'; continue; }
    if (noteRx.test(line)) { mode = 'notes'; continue; }

    if (!titleSet && mode === 'unknown' && line.length > 3 && line.length < 120) {
      title = line.replace(/^#+ /, '');
      titleSet = true;
      continue;
    }

    if (mode === 'ingredients') {
      // In ingredient mode: accept most lines, just reject obvious non-food content
      const skip =
        NON_INGREDIENT.test(line) ||
        ALL_CAPS_WORD.test(line) ||
        !/[a-zA-Z]{2,}/.test(line) ||          // must have at least one word
        !/^\d+(\.\d+)?$/.test(line) === false || // bare numbers (ratings)
        /^\d[\d\s]*(min|hour|hr|sec)/i.test(line) || // time values
        /^[\d./]+x$/i.test(line) ||             // multipliers (1x, 2x)
        line.length < 3;
      if (!skip) ingredientTexts.push(line);
    }

    if (mode === 'instructions') {
      if (IMAGE_CAPTION.test(line)) continue;
      if (ALL_CAPS_WORD.test(line)) continue;
      // Skip studio/credit lines (2-4 title-case words, no punctuation)
      if (/^([A-Z][a-zA-Z]+ ){1,3}[A-Z][a-zA-Z]+$/.test(line)) continue;
      // Skip "Watch how to…" type lines
      if (/^watch\b/i.test(line)) continue;
      const step = line.replace(/^\d+[.)]\s*/, '').trim();
      if (step.length > 20) instructions.push(step);
    }

    if (mode === 'notes') {
      if (line.length > 10) notes.push(line);
    }
  }

  return { title, ingredientTexts, instructions, cookTime, servings, parsedNotes: notes.join('\n') };
}

const DEFAULT_TAGS = [
  'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Appetizer',
  'Mexican', 'Italian', 'Asian', 'American', 'Mediterranean', 'Indian',
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Quick', 'Slow Cooker', 'Grilling',
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  onClose: () => void;
  onSave: (data: RecipeFormData) => Promise<void>;
  initialRecipe?: Recipe;
  existingTags: string[];
}

function emptyForm(): RecipeFormData {
  return {
    title: '', image: '', tags: [],
    ingredients: [], instructions: [],
    sourceUrl: '', servings: '', cookTime: '', notes: '',
  };
}

function recipeToForm(r: Recipe): RecipeFormData {
  const { id: _id, createdBy: _cb, createdAt: _ca, updatedAt: _ua, ...rest } = r;
  return rest;
}

export default function AddRecipeModal({ onClose, onSave, initialRecipe, existingTags }: Props) {
  const [form, setForm] = useState<RecipeFormData>(
    initialRecipe ? recipeToForm(initialRecipe) : emptyForm()
  );
  const [urlInput, setUrlInput] = useState(initialRecipe?.sourceUrl ?? '');
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newTag, setNewTag] = useState('');

  const allTagOptions = Array.from(new Set([...DEFAULT_TAGS, ...existingTags])).sort();

  const applyScraped = useCallback((data: ScrapedData) => {
    setForm(prev => ({
      ...prev,
      title: data.title ?? prev.title,
      image: data.image ?? prev.image,
      servings: data.servings ?? prev.servings,
      cookTime: data.cookTime ?? prev.cookTime,
      ingredients: data.ingredients?.length
        ? data.ingredients.map(t => ({ id: newId(), text: t, checked: false }))
        : prev.ingredients,
      instructions: data.instructions?.length ? data.instructions : prev.instructions,
    }));
  }, []);

  async function fetchUrl() {
    if (!urlInput.trim()) return;
    setScraping(true);
    setScrapeError('');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        applyScraped(json.data);
        setForm(prev => ({ ...prev, sourceUrl: urlInput.trim() }));
      } else {
        const blockedSites = /foodnetwork|nytimes|epicurious|bonappetit|food\.com|delish|tasty/i;
        const isBlocked = blockedSites.test(urlInput);
        setScrapeError(
          isBlocked
            ? 'This site blocks automatic fetching. Use "Paste text" below — copy the recipe from the page and paste it here.'
            : (json.error ?? 'Could not fetch that URL — try the paste option below.')
        );
        setShowPaste(true);
      }
    } catch {
      setScrapeError('Network error — check your connection');
    } finally {
      setScraping(false);
    }
  }

  function applyPaste() {
    const parsed = parseRecipeText(pasteText);
    setForm(prev => ({
      ...prev,
      title: parsed.title || prev.title,
      cookTime: parsed.cookTime || prev.cookTime,
      servings: parsed.servings || prev.servings,
      notes: parsed.parsedNotes || prev.notes,
      ingredients: parsed.ingredientTexts?.length
        ? parsed.ingredientTexts.map(t => ({ id: newId(), text: t, checked: false }))
        : prev.ingredients,
      instructions: parsed.instructions?.length ? parsed.instructions : prev.instructions,
    }));
    setPasteText('');
    setShowPaste(false);
  }

  function toggleTag(tag: string) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  function addTag() {
    const t = newTag.trim();
    if (!t || form.tags.includes(t)) { setNewTag(''); return; }
    setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setNewTag('');
  }

  function addIngredient() {
    const t = newIngredient.trim();
    if (!t) return;
    setForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { id: newId(), text: t, checked: false }],
    }));
    setNewIngredient('');
  }

  function removeIngredient(id: string) {
    setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter(i => i.id !== id) }));
  }

  function updateIngredient(id: string, text: string) {
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(i => i.id === id ? { ...i, text } : i),
    }));
  }

  function addInstruction() {
    const t = newInstruction.trim();
    if (!t) return;
    setForm(prev => ({ ...prev, instructions: [...prev.instructions, t] }));
    setNewInstruction('');
  }

  function removeInstruction(idx: number) {
    setForm(prev => ({ ...prev, instructions: prev.instructions.filter((_, i) => i !== idx) }));
  }

  function updateInstruction(idx: number, text: string) {
    setForm(prev => ({
      ...prev,
      instructions: prev.instructions.map((s, i) => i === idx ? text : s),
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={handleBackdrop}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
          <h2 className="text-lg font-bold text-stone-800">
            {initialRecipe ? 'Edit Recipe' : 'Add Recipe'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 active:bg-stone-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* URL fetch */}
          <section>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Recipe URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUrl()}
                placeholder="Paste a food blog URL…"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
              <button
                onClick={fetchUrl}
                disabled={scraping || !urlInput.trim()}
                className="shrink-0 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 active:bg-orange-600 flex items-center gap-1.5"
              >
                {scraping ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Fetching
                  </>
                ) : 'Fetch'}
              </button>
            </div>
            {scrapeError && <p className="text-xs text-red-500 mt-1.5">{scrapeError}</p>}
            <p className="text-xs text-stone-400 mt-1">
              Works on most food blogs.{' '}
              <button
                type="button"
                onClick={() => setShowPaste(p => !p)}
                className="text-orange-500 underline"
              >
                {showPaste ? 'Hide' : 'NYT or paywalled? Paste the text instead →'}
              </button>
            </p>
          </section>

          {/* Paste recipe text (NYT etc.) */}
          {showPaste && (
            <section className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-stone-700 mb-1">Paste recipe text</p>
                <p className="text-xs text-stone-500">Copy everything from the recipe page — title, ingredients, instructions — and paste it here. We&apos;ll parse out what we can.</p>
              </div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={"Paste the full recipe text here…\n\nIngredients\n2 cups flour\n1 tsp salt\n…\n\nInstructions\n1. Preheat oven…"}
                rows={8}
                className="w-full border border-orange-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 resize-none bg-white"
              />
              <button
                onClick={applyPaste}
                disabled={!pasteText.trim()}
                className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                Parse &amp; fill fields
              </button>
            </section>
          )}

          {/* Image preview */}
          {form.image && (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image} alt="preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setForm(p => ({ ...p, image: '' }))}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          )}

          {/* Image URL */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Image URL
            </label>
            <input
              type="url"
              value={form.image}
              onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
              placeholder="https://…"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Recipe name"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </div>

          {/* Cook time + Servings */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                Cook Time
              </label>
              <input
                type="text"
                value={form.cookTime}
                onChange={e => setForm(p => ({ ...p, cookTime: e.target.value }))}
                placeholder="e.g. 30m"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                Servings
              </label>
              <input
                type="text"
                value={form.servings}
                onChange={e => setForm(p => ({ ...p, servings: e.target.value }))}
                placeholder="e.g. 4"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>

          {/* Tags */}
          <section>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {allTagOptions.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all
                    ${form.tags.includes(tag)
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-stone-50 text-stone-600 border-stone-200'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Add custom tag…"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
              <button
                onClick={addTag}
                className="bg-stone-100 text-stone-700 px-3 py-2 rounded-xl text-sm font-medium active:bg-stone-200"
              >
                Add
              </button>
            </div>
          </section>

          {/* Ingredients */}
          <section>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Ingredients
            </label>
            <div className="space-y-1.5 mb-2">
              {form.ingredients.map(ing => (
                <div key={ing.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.text}
                    onChange={e => updateIngredient(ing.id, e.target.value)}
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={() => removeIngredient(ing.id)}
                    className="text-stone-300 active:text-red-400 shrink-0"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newIngredient}
                onChange={e => setNewIngredient(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIngredient()}
                placeholder="2 cups flour…"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
              <button
                onClick={addIngredient}
                className="bg-stone-100 text-stone-700 px-3 py-2 rounded-xl text-sm font-medium active:bg-stone-200"
              >
                Add
              </button>
            </div>
          </section>

          {/* Instructions */}
          <section>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Instructions
            </label>
            <div className="space-y-2 mb-2">
              {form.instructions.map((step, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="shrink-0 w-6 h-6 mt-2 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <textarea
                    value={step}
                    onChange={e => updateInstruction(idx, e.target.value)}
                    rows={2}
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none"
                  />
                  <button
                    onClick={() => removeInstruction(idx)}
                    className="text-stone-300 active:text-red-400 shrink-0 mt-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={newInstruction}
                onChange={e => setNewInstruction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addInstruction())}
                placeholder="Describe the next step… (Enter to add)"
                rows={2}
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none"
              />
              <button
                onClick={addInstruction}
                className="self-end bg-stone-100 text-stone-700 px-3 py-2 rounded-xl text-sm font-medium active:bg-stone-200"
              >
                Add
              </button>
            </div>
          </section>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Our tweaks, substitutions, tips…"
              rows={3}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 resize-none"
            />
          </div>

          {/* Source URL (read-only after scrape, but editable) */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
              Source URL
            </label>
            <input
              type="url"
              value={form.sourceUrl}
              onChange={e => setForm(p => ({ ...p, sourceUrl: e.target.value }))}
              placeholder="https://…"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </div>

          {/* Bottom padding for safe area */}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium text-sm active:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium text-sm disabled:opacity-50 active:bg-orange-600"
          >
            {saving ? 'Saving…' : initialRecipe ? 'Save Changes' : 'Add Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
