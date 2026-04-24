'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToRecipes, addRecipe, updateRecipe, deleteRecipe } from '@/lib/firestore';
import type { Recipe, RecipeFormData } from '@/types/recipe';
import { autoDetectTags } from '@/lib/autoTags';
import SignIn from '@/components/SignIn';
import Header from '@/components/Header';
import TagFilterBar from '@/components/TagFilterBar';
import RecipeGrid from '@/components/RecipeGrid';
import AddRecipeModal from '@/components/AddRecipeModal';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import ManageTagsModal from '@/components/ManageTagsModal';

export default function Home() {
  const { user, loading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'az' | 'za' | 'rating'>('newest');
  const [showSort, setShowSort] = useState(false);
  const [retagging, setRetagging] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToRecipes(setRecipes);
  }, [user]);

  useEffect(() => {
    if (!showSort) return;
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSort]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => r.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const filtered = recipes.filter(recipe => {
      if (selectedTags.length > 0 && !selectedTags.every(t => recipe.tags.includes(t))) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          recipe.title.toLowerCase().includes(q) ||
          recipe.tags.some(t => t.toLowerCase().includes(q)) ||
          recipe.ingredients.some(i => i.text.toLowerCase().includes(q))
        );
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'oldest': return a.createdAt.getTime() - b.createdAt.getTime();
        case 'az':     return a.title.localeCompare(b.title);
        case 'za':     return b.title.localeCompare(a.title);
        case 'rating': return (b.rating ?? 0) - (a.rating ?? 0);
        default:       return b.createdAt.getTime() - a.createdAt.getTime(); // newest
      }
    });
  }, [recipes, selectedTags, searchQuery, sort]);

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave(data: RecipeFormData) {
    if (!user) return;
    if (editingRecipe) {
      await updateRecipe(editingRecipe.id, data);
    } else {
      await addRecipe(data, user.uid);
    }
    setEditingRecipe(null);
  }

  async function removeTags(tagsToRemove: string[]) {
    const toRemove = new Set(tagsToRemove);
    for (const recipe of recipes) {
      const filtered = recipe.tags.filter(t => !toRemove.has(t));
      if (filtered.length !== recipe.tags.length) {
        await updateRecipe(recipe.id, { tags: filtered });
      }
    }
  }

  async function retagAllRecipes() {
    setRetagging(true);
    for (const recipe of recipes) {
      const detected = autoDetectTags(
        recipe.title,
        recipe.ingredients.map(i => i.text),
        recipe.instructions,
      );
      const merged = Array.from(new Set([...recipe.tags, ...detected]));
      if (merged.length !== recipe.tags.length || merged.some(t => !recipe.tags.includes(t))) {
        await updateRecipe(recipe.id, { tags: merged });
      }
    }
    setRetagging(false);
  }

  async function handleDelete() {
    if (!selectedRecipe) return;
    if (!confirm(`Delete "${selectedRecipe.title}"?`)) return;
    await deleteRecipe(selectedRecipe.id);
    setSelectedRecipe(null);
  }

  function handleEdit() {
    if (!selectedRecipe) return;
    setEditingRecipe(selectedRecipe);
    setSelectedRecipe(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <SignIn />;

  return (
    <div className="min-h-screen bg-stone-50">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddRecipe={() => setShowAddModal(true)}
        onRetagRecipes={retagAllRecipes}
        retagging={retagging}
        onManageTags={() => setShowManageTags(true)}
      />

      <TagFilterBar
        tags={allTags}
        selected={selectedTags}
        onToggle={toggleTag}
      />

      {/* Sort / count bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-stone-400">
          {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} className="ml-2 text-orange-500 font-medium">
              Clear filters
            </button>
          )}
        </span>
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSort(s => !s)}
            className="flex items-center gap-1 text-xs text-stone-500 font-medium bg-stone-100 px-3 py-1.5 rounded-lg active:bg-stone-200"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M3 6h18M6 12h12M9 18h6" />
            </svg>
            {{ newest: 'Newest', oldest: 'Oldest', az: 'A → Z', za: 'Z → A', rating: 'Top rated' }[sort]}
          </button>
          {showSort && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-stone-100 py-1 w-36 z-20">
              {([
                ['newest', 'Newest first'],
                ['oldest', 'Oldest first'],
                ['az',     'A → Z'],
                ['za',     'Z → A'],
                ['rating', 'Top rated'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSort(key); setShowSort(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${sort === key ? 'text-orange-500 font-medium' : 'text-stone-600'} active:bg-stone-50`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecipeGrid recipes={filteredRecipes} onRecipeClick={setSelectedRecipe} />

      {(showAddModal || editingRecipe) && (
        <AddRecipeModal
          onClose={() => { setShowAddModal(false); setEditingRecipe(null); }}
          onSave={handleSave}
          initialRecipe={editingRecipe ?? undefined}
          existingTags={allTags}
        />
      )}

      {showManageTags && (
        <ManageTagsModal
          tags={allTags}
          onClose={() => setShowManageTags(false)}
          onRemove={removeTags}
        />
      )}

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
