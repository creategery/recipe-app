'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Recipe } from '@/types/recipe';
import { updateRecipe } from '@/lib/firestore';
import { tagColor } from './TagFilterBar';

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// --- serving scaler helpers ---

function parseBaseServings(servings: string): number {
  const match = servings.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

function parseFraction(str: string): number {
  str = str.trim();
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  return parseFloat(str);
}

function formatNumber(n: number): string {
  if (n === 0) return '0';
  const whole = Math.floor(n);
  const dec = n - whole;
  const fracs: [number, string][] = [
    [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
    [0.5, '½'], [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
  ];
  for (const [val, sym] of fracs) {
    if (Math.abs(dec - val) < 0.05) return whole > 0 ? `${whole} ${sym}` : sym;
  }
  if (Number.isInteger(n)) return n.toString();
  return n % 1 < 0.05 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, '');
}

function scaleIngredient(text: string, factor: number): string {
  if (factor === 1) return text;
  return text.replace(
    /\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+/g,
    match => formatNumber(parseFraction(match) * factor)
  );
}

// --- wake lock ---

type WakeLockSentinel = { release: () => Promise<void> };

export default function RecipeDetailModal({ recipe, onClose, onEdit, onDelete }: Props) {
  const baseServings = parseBaseServings(recipe.servings);
  const [currentServings, setCurrentServings] = useState(baseServings || 1);
  const [cookMode, setCookMode] = useState(false);
  const [rating, setRating] = useState(recipe.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [notesText, setNotesText] = useState(recipe.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const scaleFactor = baseServings > 0 ? currentServings / baseServings : 1;

  // Wake lock management
  const enableWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
        setCookMode(true);
      } catch {
        // Wake lock denied (e.g. low battery) — fail silently
        setCookMode(true);
      }
    } else {
      setCookMode(true);
    }
  }, []);

  const disableWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    setCookMode(false);
  }, []);

  async function toggleCookMode() {
    if (cookMode) await disableWakeLock();
    else await enableWakeLock();
  }

  useEffect(() => {
    return () => { disableWakeLock(); };
  }, [disableWakeLock]);

  useEffect(() => {
    if (!cookMode) return;
    const handler = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        await enableWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [cookMode, enableWakeLock]);

  async function toggleIngredient(id: string, checked: boolean) {
    const updated = recipe.ingredients.map(i => i.id === id ? { ...i, checked } : i);
    await updateRecipe(recipe.id, { ingredients: updated });
  }

  async function clearChecks() {
    const updated = recipe.ingredients.map(i => ({ ...i, checked: false }));
    await updateRecipe(recipe.id, { ingredients: updated });
  }

  async function handleRating(star: number) {
    const newRating = rating === star ? 0 : star; // tap same star to clear
    setRating(newRating);
    await updateRecipe(recipe.id, { rating: newRating });
  }

  async function saveNotes() {
    setSavingNotes(true);
    await updateRecipe(recipe.id, { notes: notesText });
    setSavingNotes(false);
    setShowNotesEditor(false);
  }

  function handleOpenNotes() {
    setNotesText(recipe.notes ?? '');
    setShowNotesEditor(true);
    setTimeout(() => notesRef.current?.focus(), 50);
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const checkedCount = recipe.ingredients.filter(i => i.checked).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={handleBackdrop}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[95vh] flex flex-col">

        {/* Cook mode banner */}
        {cookMode && (
          <div className="shrink-0 bg-orange-500 text-white text-xs font-medium text-center py-2 rounded-t-2xl sm:rounded-t-2xl flex items-center justify-center gap-2">
            <span>🔆 Screen staying on</span>
            <button onClick={toggleCookMode} className="underline opacity-80">Turn off</button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Image — inside scroll so it scrolls away on small screens */}
          {recipe.image && (
            <div className={`relative aspect-video overflow-hidden bg-stone-100 ${cookMode ? '' : 'rounded-t-2xl'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
              <button
                onClick={onClose}
                className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white rounded-full w-8 h-8 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Title + meta */}
          <div className="px-5 pt-4 pb-3">
            {!recipe.image && (
              <button onClick={onClose} className="mb-3 text-stone-400 active:text-stone-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Title row with star rating */}
            <div className="flex items-start gap-3 mb-3">
              <h2 className="flex-1 text-xl font-bold text-stone-800 leading-snug">{recipe.title}</h2>
              <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 active:scale-110 transition-transform"
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth={1.5}
                      fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      className={(hoverRating || rating) >= star ? 'text-amber-400' : 'text-stone-300'}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 mb-3">
              {recipe.cookTime && (
                <span className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
                  </svg>
                  {recipe.cookTime}
                </span>
              )}

              {/* Servings stepper */}
              {baseServings > 0 && (
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg px-1 py-0.5">
                    <button
                      onClick={() => setCurrentServings(s => Math.max(1, s - 1))}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-500 active:bg-stone-200 font-bold text-base leading-none"
                    >−</button>
                    <span className="text-sm font-semibold text-stone-700 min-w-[1.5rem] text-center">{currentServings}</span>
                    <button
                      onClick={() => setCurrentServings(s => s + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-stone-500 active:bg-stone-200 font-bold text-base leading-none"
                    >+</button>
                  </div>
                  <span className="text-stone-400">servings</span>
                  {scaleFactor !== 1 && (
                    <button onClick={() => setCurrentServings(baseServings)} className="text-xs text-orange-500 font-medium">
                      reset
                    </button>
                  )}
                </div>
              )}

              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-orange-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Source
                </a>
              )}
            </div>

            {/* Cook mode toggle */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-stone-500">Cook mode</span>
              <button
                onClick={toggleCookMode}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${cookMode ? 'bg-orange-500' : 'bg-stone-200'}`}
                aria-label="Toggle cook mode"
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${cookMode ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {/* Tags */}
            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map(tag => (
                  <span key={tag} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tagColor(tag)}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Ingredients */}
          {recipe.ingredients.length > 0 && (
            <section className="px-5 py-4 border-t border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-stone-700">
                  Ingredients
                  {scaleFactor !== 1 && (
                    <span className="ml-2 text-xs font-normal text-orange-500">
                      (scaled {scaleFactor > 1 ? '↑' : '↓'}{Math.round(scaleFactor * 100)}%)
                    </span>
                  )}
                </h3>
                {checkedCount > 0 && (
                  <button onClick={clearChecks} className="text-xs text-orange-500 font-medium">
                    Clear {checkedCount} ✓
                  </button>
                )}
              </div>
              <ul className="space-y-2">
                {recipe.ingredients.map(ing => (
                  <li key={ing.id}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ing.checked}
                        onChange={e => toggleIngredient(ing.id, e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded border-stone-300 text-orange-500 accent-orange-500 shrink-0"
                      />
                      <span className={`text-sm leading-relaxed ${ing.checked ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                        {scaleIngredient(ing.text, scaleFactor)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {recipe.instructions.length > 0 && (
            <section className="px-5 py-4 border-t border-stone-100">
              <h3 className="font-bold text-stone-700 mb-3">Instructions</h3>
              <ol className="space-y-4">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-stone-700 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Notes */}
          {(recipe.notes || showNotesEditor) && (
            <section className="px-5 py-4 border-t border-stone-100">
              <h3 className="font-bold text-stone-700 mb-2">Notes</h3>
              {showNotesEditor ? (
                <div className="space-y-2">
                  <textarea
                    ref={notesRef}
                    value={notesText}
                    onChange={e => setNotesText(e.target.value)}
                    rows={4}
                    placeholder="Add your notes, tweaks, tips…"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowNotesEditor(false)}
                      className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-500 text-sm"
                    >Cancel</button>
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-50"
                    >{savingNotes ? 'Saving…' : 'Save'}</button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={handleOpenNotes}
                  className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap cursor-pointer active:text-stone-800"
                >
                  {recipe.notes}
                </p>
              )}
            </section>
          )}

          <div className="h-6" />
        </div>

        {/* Footer actions — hidden while notes editor is open */}
        {!showNotesEditor && <div className="px-5 py-4 border-t border-stone-100 flex gap-3 shrink-0">
          <button
            onClick={onDelete}
            className="py-3 px-4 rounded-xl border border-stone-200 text-stone-400 active:bg-red-50 active:text-red-500 active:border-red-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
          <button
            onClick={handleOpenNotes}
            className="py-3 px-4 rounded-xl border border-stone-200 text-stone-400 active:bg-stone-50 active:text-stone-600"
            aria-label="Add notes"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M16.862 4.487a2.032 2.032 0 1 1 2.872 2.872L7.5 19.613l-4 1 1-4 12.362-12.126Z" />
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium text-sm active:bg-orange-600"
          >
            Edit Recipe
          </button>
        </div>}
      </div>
    </div>
  );
}
