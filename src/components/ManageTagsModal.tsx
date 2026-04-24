'use client';

import { useState } from 'react';

interface ManageTagsModalProps {
  tags: string[];
  onClose: () => void;
  onRemove: (tags: string[]) => Promise<void>;
}

export default function ManageTagsModal({ tags, onClose, onRemove }: ManageTagsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);

  function toggle(tag: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === tags.length ? new Set() : new Set(tags));
  }

  async function handleRemove() {
    if (selected.size === 0) return;
    setRemoving(true);
    await onRemove(Array.from(selected));
    setRemoving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div
        className="mt-auto bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-base font-semibold text-stone-800">Manage tags</h2>
          <button onClick={onClose} className="text-stone-400 p-1">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-2 flex items-center justify-between">
          <span className="text-xs text-stone-400">{selected.size} of {tags.length} selected</span>
          <button onClick={toggleAll} className="text-xs text-orange-500 font-medium">
            {selected.size === tags.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const active = selected.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-all
                    ${active
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                >
                  {active && (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-6 pt-2 border-t border-stone-100">
          <button
            onClick={handleRemove}
            disabled={selected.size === 0 || removing}
            className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {removing
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Removing…</>
              : `Remove ${selected.size > 0 ? `${selected.size} tag${selected.size > 1 ? 's' : ''}` : 'tags'} from all recipes`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
