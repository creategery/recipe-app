'use client';

import { useEffect } from 'react';
import type { Recipe } from '@/types/recipe';
import { updateRecipe } from '@/lib/firestore';
import { tagColor } from './TagFilterBar';

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RecipeDetailModal({ recipe, onClose, onEdit, onDelete }: Props) {
  async function toggleIngredient(id: string, checked: boolean) {
    const updated = recipe.ingredients.map(i =>
      i.id === id ? { ...i, checked } : i
    );
    await updateRecipe(recipe.id, { ingredients: updated });
  }

  async function clearChecks() {
    const updated = recipe.ingredients.map(i => ({ ...i, checked: false }));
    await updateRecipe(recipe.id, { ingredients: updated });
  }

  // close on backdrop
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // close on Escape
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

        {/* Image */}
        {recipe.image && (
          <div className="relative shrink-0 aspect-video rounded-t-2xl overflow-hidden bg-stone-100">
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Title + meta */}
          <div className="px-5 pt-4 pb-3">
            {!recipe.image && (
              <button onClick={onClose} className="mb-3 text-stone-400 active:text-stone-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-bold text-stone-800 leading-snug mb-3">{recipe.title}</h2>

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
              {recipe.servings && (
                <span className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {recipe.servings} servings
                </span>
              )}
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-orange-500"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Source
                </a>
              )}
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
                <h3 className="font-bold text-stone-700">Ingredients</h3>
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
                        {ing.text}
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
          {recipe.notes && (
            <section className="px-5 py-4 border-t border-stone-100">
              <h3 className="font-bold text-stone-700 mb-2">Notes</h3>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{recipe.notes}</p>
            </section>
          )}

          <div className="h-6" />
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-stone-100 flex gap-3 shrink-0">
          <button
            onClick={onDelete}
            className="py-3 px-4 rounded-xl border border-stone-200 text-stone-400 active:bg-red-50 active:text-red-500 active:border-red-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium text-sm active:bg-orange-600"
          >
            Edit Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
