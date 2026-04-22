'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToRecipes, addRecipe, updateRecipe, deleteRecipe } from '@/lib/firestore';
import type { Recipe, RecipeFormData } from '@/types/recipe';
import SignIn from '@/components/SignIn';
import Header from '@/components/Header';
import TagFilterBar from '@/components/TagFilterBar';
import RecipeGrid from '@/components/RecipeGrid';
import AddRecipeModal from '@/components/AddRecipeModal';
import RecipeDetailModal from '@/components/RecipeDetailModal';

export default function Home() {
  const { user, loading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToRecipes(setRecipes);
  }, [user]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => r.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
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
  }, [recipes, selectedTags, searchQuery]);

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
      />

      <TagFilterBar
        tags={allTags}
        selected={selectedTags}
        onToggle={toggleTag}
      />

      {selectedTags.length > 0 && (
        <div className="px-4 pb-1 flex items-center gap-2">
          <span className="text-xs text-stone-400">{filteredRecipes.length} result{filteredRecipes.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setSelectedTags([])}
            className="text-xs text-orange-500 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      <RecipeGrid recipes={filteredRecipes} onRecipeClick={setSelectedRecipe} />

      {(showAddModal || editingRecipe) && (
        <AddRecipeModal
          onClose={() => { setShowAddModal(false); setEditingRecipe(null); }}
          onSave={handleSave}
          initialRecipe={editingRecipe ?? undefined}
          existingTags={allTags}
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
