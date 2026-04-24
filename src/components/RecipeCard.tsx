'use client';

import type { Recipe } from '@/types/recipe';
import { tagColor } from './TagFilterBar';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 active:scale-[0.97] transition-transform"
    >
      <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
        {recipe.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover group-active:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">
            🍽
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-stone-800 text-sm leading-snug line-clamp-2 mb-2">
          {recipe.title}
        </h3>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {recipe.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${tagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-[10px] text-stone-400">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}

        {(recipe.cookTime || recipe.servings || recipe.ingredients.length > 0) && (
          <div className="flex items-center gap-2 text-[11px] text-stone-400">
            {recipe.cookTime && (
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 6v6l4 2" />
                </svg>
                {recipe.cookTime}
              </span>
            )}
            {recipe.cookTime && recipe.servings && <span>·</span>}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path strokeLinecap="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {recipe.servings}
              </span>
            )}
            {recipe.ingredients.length > 0 && (recipe.cookTime || recipe.servings) && <span>·</span>}
            {recipe.ingredients.length > 0 && (
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                </svg>
                {recipe.ingredients.length} ing
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
