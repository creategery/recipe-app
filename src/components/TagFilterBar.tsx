'use client';

const TAG_COLORS: Record<string, string> = {};
const PALETTE = [
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-red-100 text-red-700 border-red-200',
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
