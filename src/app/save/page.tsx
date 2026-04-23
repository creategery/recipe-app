'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { addRecipe } from '@/lib/firestore';
import type { RecipeFormData } from '@/types/recipe';
import SignIn from '@/components/SignIn';

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

interface BookmarkletData {
  title: string;
  image: string;
  ingredients: string[];
  instructions: string[];
  servings: string;
  cookTime: string;
  sourceUrl: string;
}

function decodeData(raw: string): BookmarkletData | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw)))));
  } catch {
    return null;
  }
}

export default function SavePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState<RecipeFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = params.get('data');
    if (!raw) { setError('No recipe data found.'); return; }
    const decoded = decodeData(raw);
    if (!decoded) { setError('Could not read recipe data.'); return; }
    setForm({
      title: decoded.title || '',
      image: decoded.image || '',
      tags: [],
      ingredients: decoded.ingredients.map(t => ({ id: newId(), text: t, checked: false })),
      instructions: decoded.instructions,
      sourceUrl: decoded.sourceUrl || '',
      servings: decoded.servings || '',
      cookTime: decoded.cookTime || '',
      notes: '',
    });
  }, [params]);

  async function handleSave() {
    if (!user || !form) return;
    setSaving(true);
    try {
      await addRecipe(form, user.uid);
      router.push('/');
    } catch {
      setError('Failed to save recipe.');
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <SignIn />;

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="text-stone-600">{error}</p>
      <button onClick={() => router.push('/')} className="text-orange-500 font-medium">Go home</button>
    </div>
  );

  if (!form) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.push('/')} className="text-stone-400 active:text-stone-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-stone-800 flex-1">Save Recipe</h1>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving</>
            ) : 'Save'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Image preview */}
        {form.image && (
          <div className="relative rounded-xl overflow-hidden aspect-video bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.image} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setForm(f => f ? { ...f, image: '' } : f)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center"
            >×</button>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => f ? { ...f, title: e.target.value } : f)}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </div>

        {/* Cook time + servings */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Cook Time</label>
            <input
              type="text"
              value={form.cookTime}
              onChange={e => setForm(f => f ? { ...f, cookTime: e.target.value } : f)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Servings</label>
            <input
              type="text"
              value={form.servings}
              onChange={e => setForm(f => f ? { ...f, servings: e.target.value } : f)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
            />
          </div>
        </div>

        {/* Ingredients */}
        {form.ingredients.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Ingredients ({form.ingredients.length})
            </label>
            <div className="space-y-1.5">
              {form.ingredients.map(ing => (
                <div key={ing.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.text}
                    onChange={e => setForm(f => f ? {
                      ...f,
                      ingredients: f.ingredients.map(i => i.id === ing.id ? { ...i, text: e.target.value } : i)
                    } : f)}
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={() => setForm(f => f ? { ...f, ingredients: f.ingredients.filter(i => i.id !== ing.id) } : f)}
                    className="text-stone-300 active:text-red-400 shrink-0"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {form.instructions.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
              Instructions ({form.instructions.length} steps)
            </label>
            <ol className="space-y-2">
              {form.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="shrink-0 w-6 h-6 mt-2 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <textarea
                    value={step}
                    onChange={e => setForm(f => f ? {
                      ...f,
                      instructions: f.instructions.map((s, i) => i === idx ? e.target.value : s)
                    } : f)}
                    rows={2}
                    className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none"
                  />
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Source */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Source URL</label>
          <input
            type="url"
            value={form.sourceUrl}
            onChange={e => setForm(f => f ? { ...f, sourceUrl: e.target.value } : f)}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => f ? { ...f, notes: e.target.value } : f)}
            placeholder="Your tweaks, tips…"
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 resize-none"
          />
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
