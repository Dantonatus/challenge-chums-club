import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CATEGORIES, FavoriteCategory } from "@/lib/favorites/types";
import { Plus } from "lucide-react";

interface Props {
  onAdd: (title: string, category: FavoriteCategory) => void;
}

export default function QuickAddFavorite({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<FavoriteCategory>("music");

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd(t, category);
    setTitle("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Titel eingeben…"
          className="pr-10"
        />
        <button
          onClick={submit}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Hinzufügen"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === c.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
