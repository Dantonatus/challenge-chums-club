import { useState, useMemo } from "react";
import { Heart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFavorites } from "@/hooks/useFavorites";
import QuickAddFavorite from "@/components/favorites/QuickAddFavorite";
import CategoryFilter from "@/components/favorites/CategoryFilter";
import FavoriteCard from "@/components/favorites/FavoriteCard";
import FavoriteDetailSheet from "@/components/favorites/FavoriteDetailSheet";
import type { Favorite, FavoriteCategory } from "@/lib/favorites/types";
import { toast } from "sonner";

export default function FavoritesPage() {
  const { favorites, isLoading, add, update, remove } = useFavorites();
  const [filter, setFilter] = useState<FavoriteCategory | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Favorite | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    favorites.forEach((f) => {
      m[f.category] = (m[f.category] ?? 0) + 1;
    });
    return m;
  }, [favorites]);

  const filtered = useMemo(() => {
    let list = favorites;
    if (filter) list = list.filter((f) => f.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.subtitle?.toLowerCase().includes(q) ||
          f.note?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [favorites, filter, search]);

  const handleAdd = (title: string, category: FavoriteCategory) => {
    add.mutate({ title, category }, { onSuccess: () => toast.success("Hinzugefügt!") });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Favorites</h1>
        </div>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="pl-8 h-9"
          />
        </div>
      </div>

      <QuickAddFavorite onAdd={handleAdd} />

      <CategoryFilter active={filter} onChange={setFilter} counts={counts} />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laden…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Heart className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Noch keine Einträge</p>
          <p className="text-sm">Füge oben deinen ersten Favoriten hinzu!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((f) => (
            <FavoriteCard key={f.id} item={f} onClick={() => setEditing(f)} />
          ))}
        </div>
      )}

      <FavoriteDetailSheet
        item={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={(data) => update.mutate(data)}
        onDelete={(id) =>
          remove.mutate(id, { onSuccess: () => toast.success("Gelöscht") })
        }
      />
    </div>
  );
}
