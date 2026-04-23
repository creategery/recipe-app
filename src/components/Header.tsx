'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddRecipe: () => void;
}

export default function Header({ searchQuery, onSearchChange, onAddRecipe }: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-stone-100 shadow-sm">
      <div className="flex items-center gap-2 px-4 h-14">
        {showSearch ? (
          <>
            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search recipes, ingredients…"
              className="flex-1 bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none"
            />
            <button
              onClick={() => { setShowSearch(false); onSearchChange(''); }}
              className="text-stone-500 text-sm font-medium px-1"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h1 className="flex-1 text-lg font-bold text-stone-800">🍳 Recipe Box</h1>
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-xl text-stone-500 active:bg-stone-100"
              aria-label="Search"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <button
              onClick={onAddRecipe}
              className="p-2 rounded-xl bg-orange-500 text-white active:bg-orange-600"
              aria-label="Add recipe"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(m => !m)}
                className="ml-1 w-8 h-8 rounded-full overflow-hidden border-2 border-stone-200 active:border-orange-400"
              >
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt={user.displayName || 'avatar'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold">
                    {user?.displayName?.[0] ?? '?'}
                  </div>
                )}
              </button>
              {showMenu && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-stone-100 py-1 w-44 z-50">
                  <div className="px-4 py-2 text-xs text-stone-400 truncate">{user?.email}</div>
                  <hr className="border-stone-100" />
                  <button
                    onClick={() => { setShowMenu(false); router.push('/import'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-600 active:bg-stone-50"
                  >
                    📋 Import recipes
                  </button>
                  <hr className="border-stone-100" />
                  <button
                    onClick={() => { setShowMenu(false); signOut(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-600 active:bg-stone-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
