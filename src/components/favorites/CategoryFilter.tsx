import { CATEGORIES, FavoriteCategory } from "@/lib/favorites/types";

interface Props {
  active: FavoriteCategory | null;
  onChange: (cat: FavoriteCategory | null) => void;
  counts: Record<string, number>;
}

export default function CategoryFilter({ active, onChange, counts }: Props) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          active === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent"
        }`}
      >
        Alle ({total})
      </button>
      {CATEGORIES.map((c) => {
        const count = counts[c.value] ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={c.value}
            onClick={() => onChange(active === c.value ? null : c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              active === c.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {c.emoji} {c.label} ({count})
          </button>
        );
      })}
    </div>
  );
}
