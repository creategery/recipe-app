'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { addRecipe } from '@/lib/firestore';
import type { RecipeFormData, ScrapedData } from '@/types/recipe';
import SignIn from '@/components/SignIn';

type ImportStatus = 'pending' | 'fetching' | 'done' | 'error' | 'manual';

interface ImportCard {
  id: string;
  name: string;
  url: string | null;
  rawDesc: string;
  scraped: ScrapedData | null;
  status: ImportStatus;
  error?: string;
  selected: boolean;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s"'<>)]+/);
  return match ? match[0].replace(/[.,;]+$/, '') : null;
}

// --- Trello JSON parser ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTrelloJson(json: any): ImportCard[] {
  const cards = json.cards ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return cards.filter((c: any) => !c.closed).map((c: any) => {
    // Find URL: attachments first, then name, then desc
    let url: string | null = null;
    if (c.attachments?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const urlAttachment = c.attachments.find((a: any) => a.url?.startsWith('http'));
      if (urlAttachment) url = urlAttachment.url;
    }
    if (!url) url = extractUrl(c.name ?? '');
    if (!url) url = extractUrl(c.desc ?? '');

    const name = url && c.name === url ? '' : (c.name ?? '');

    return {
      id: newId(),
      name,
      url,
      rawDesc: c.desc ?? '',
      scraped: null,
      status: url ? 'pending' : 'manual',
      selected: true,
    } as ImportCard;
  });
}

function cardToRecipe(card: ImportCard): RecipeFormData {
  const s = card.scraped;
  return {
    title: s?.title || card.name || card.url || 'Untitled',
    image: s?.image || '',
    tags: [],
    ingredients: (s?.ingredients ?? []).map(t => ({ id: newId(), text: t, checked: false })),
    instructions: s?.instructions ?? [],
    sourceUrl: card.url || '',
    servings: s?.servings || '',
    cookTime: s?.cookTime || '',
    notes: !card.url && card.rawDesc ? card.rawDesc : '',
  };
}

export default function ImportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'trello' | 'urls'>('trello');
  const [cards, setCards] = useState<ImportCard[]>([]);
  const [urlText, setUrlText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'preview' | 'importing' | 'done'>('idle');
  const [importedCount, setImportedCount] = useState(0);
  const [fileError, setFileError] = useState('');

  const updateCard = useCallback((id: string, patch: Partial<ImportCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  // --- Trello file upload ---
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json.cards) throw new Error('No cards found — make sure you exported the full board JSON.');
      const parsed = parseTrelloJson(json);
      setCards(parsed);
      setPhase('preview');
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not parse file');
    }
  }

  // --- URL list tab ---
  function handleUrlList() {
    const urls = urlText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('http'));
    if (!urls.length) return;
    const parsed: ImportCard[] = urls.map(url => ({
      id: newId(), name: '', url, rawDesc: '',
      scraped: null, status: 'pending', selected: true,
    }));
    setCards(parsed);
    setPhase('preview');
  }

  // --- Scrape all pending ---
  async function scrapeAll() {
    const toFetch = cards.filter(c => c.status === 'pending');
    for (const card of toFetch) {
      updateCard(card.id, { status: 'fetching' });
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: card.url }),
        });
        const json = await res.json();
        if (json.success) {
          updateCard(card.id, { scraped: json.data, status: 'done' });
        } else {
          updateCard(card.id, { status: 'error', error: json.error });
        }
      } catch {
        updateCard(card.id, { status: 'error', error: 'Network error' });
      }
      // small delay to avoid hammering
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // --- Import selected ---
  async function importSelected() {
    if (!user) return;
    setPhase('importing');
    let count = 0;
    for (const card of cards.filter(c => c.selected)) {
      await addRecipe(cardToRecipe(card), user.uid);
      count++;
      setImportedCount(count);
    }
    setPhase('done');
  }

  const selectedCount = cards.filter(c => c.selected).length;
  const scrapedCount = cards.filter(c => c.status === 'done').length;
  const pendingCount = cards.filter(c => c.status === 'pending').length;
  const fetchingAny = cards.some(c => c.status === 'fetching');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <SignIn />;

  if (phase === 'done') return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-stone-800 mb-2">All done!</h1>
      <p className="text-stone-500 mb-6">Imported {importedCount} recipe{importedCount !== 1 ? 's' : ''} into Recipease.</p>
      <button onClick={() => router.push('/')} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium">
        Go to my recipes
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.push('/')} className="text-stone-400 active:text-stone-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-stone-800 flex-1">Import Recipes</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">

        {phase === 'idle' && (
          <>
            {/* Tabs */}
            <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
              {(['trello', 'urls'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors
                    ${tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
                >
                  {t === 'trello' ? '📋 Trello board' : '🔗 Paste URLs'}
                </button>
              ))}
            </div>

            {tab === 'trello' && (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-stone-600 space-y-2">
                  <p className="font-semibold text-stone-700">How to export your Trello board:</p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-500">
                    <li>Open your Trello board</li>
                    <li>Click <strong>···</strong> (More) in the top right</li>
                    <li>Click <strong>Print and Export</strong></li>
                    <li>Click <strong>Export as JSON</strong></li>
                    <li>Upload that file here</li>
                  </ol>
                </div>

                <label className="block">
                  <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 transition-colors">
                    <div className="text-3xl mb-2">📂</div>
                    <p className="text-stone-600 font-medium">Tap to upload Trello JSON</p>
                    <p className="text-stone-400 text-xs mt-1">e.g. Meal Planning.json</p>
                  </div>
                  <input type="file" accept=".json" onChange={handleFile} className="hidden" />
                </label>
                {fileError && <p className="text-sm text-red-500">{fileError}</p>}
              </div>
            )}

            {tab === 'urls' && (
              <div className="space-y-4">
                <p className="text-sm text-stone-500">Paste one URL per line — the scraper will pull the recipe details from each one.</p>
                <textarea
                  value={urlText}
                  onChange={e => setUrlText(e.target.value)}
                  placeholder={"https://www.seriouseats.com/...\nhttps://www.allrecipes.com/...\nhttps://..."}
                  rows={8}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 resize-none font-mono"
                />
                <button
                  onClick={handleUrlList}
                  disabled={!urlText.trim()}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Preview Import
                </button>
              </div>
            )}
          </>
        )}

        {(phase === 'preview' || phase === 'importing') && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-stone-500">
                {cards.length} cards found · {selectedCount} selected
                {scrapedCount > 0 && ` · ${scrapedCount} scraped`}
              </p>
              <button onClick={() => { setCards([]); setPhase('idle'); }} className="text-xs text-stone-400">
                Start over
              </button>
            </div>

            {/* Scrape button */}
            {pendingCount > 0 && (
              <button
                onClick={scrapeAll}
                disabled={fetchingAny}
                className="w-full mb-4 py-3 bg-stone-800 text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {fetchingAny
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Fetching recipes…</>
                  : `🔍 Fetch details for ${pendingCount} URL${pendingCount !== 1 ? 's' : ''}`
                }
              </button>
            )}

            {/* Card list */}
            <div className="space-y-2 mb-6">
              {cards.map(card => (
                <div
                  key={card.id}
                  className={`bg-white rounded-xl border p-3 flex gap-3 transition-opacity
                    ${card.selected ? 'border-stone-200' : 'border-stone-100 opacity-50'}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={card.selected}
                    onChange={e => updateCard(card.id, { selected: e.target.checked })}
                    className="mt-1 accent-orange-500 shrink-0"
                  />

                  {/* Thumbnail */}
                  {card.scraped?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.scraped.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center text-2xl shrink-0">
                      {card.status === 'fetching' ? (
                        <span className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                      ) : card.status === 'error' ? '⚠️' : card.status === 'manual' ? '✍️' : '🔗'}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {card.scraped?.title || card.name || card.url || 'Untitled'}
                    </p>
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {card.url || (card.status === 'manual' ? 'Manual entry' : '')}
                    </p>
                    {card.status === 'error' && (
                      <p className="text-xs text-red-400 mt-0.5">{card.error}</p>
                    )}
                    {card.status === 'done' && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {card.scraped?.ingredients?.length
                          ? `${card.scraped.ingredients.length} ingredients scraped`
                          : 'Image + title scraped'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Import button */}
            <button
              onClick={importSelected}
              disabled={selectedCount === 0 || phase === 'importing' || fetchingAny}
              className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {phase === 'importing'
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing {importedCount}/{selectedCount}…</>
                : `Import ${selectedCount} recipe${selectedCount !== 1 ? 's' : ''} →`
              }
            </button>
            <p className="text-xs text-stone-400 text-center mt-2">
              You can edit any recipe after importing
            </p>
          </>
        )}
      </div>
    </div>
  );
}
