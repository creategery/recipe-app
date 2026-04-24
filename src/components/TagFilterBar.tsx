'use client';

const TAG_COLORS: Record<string, string> = {};
const PALETTE = [
  'bg-red-100 text-red-700 border-red-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-lime-100 text-lime-700 border-lime-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-pink-100 text-pink-700 border-pink-200',
];

function tagColor(tag: string): string {
  if (!TAG_COLORS[tag]) {
    let hash = 0;
    for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    TAG_COLORS[tag] = PALETTE[hash % PALETTE.length];
  }
  return TAG_COLORS[tag];
}

interface TagFilterBarProps {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export default function TagFilterBar({ tags, selected, onToggle }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5">
      {tags.map(tag => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full border transition-all active:scale-95
              ${active
                ? 'bg-orange-500 text-white border-orange-500'
                : `${tagColor(tag)} border`
              }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

export { tagColor };
