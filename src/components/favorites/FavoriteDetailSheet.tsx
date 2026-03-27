import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { Favorite, CATEGORIES, FavoriteCategory, getCategoryMeta } from "@/lib/favorites/types";

interface Props {
  item: Favorite | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Favorite> & { id: string }) => void;
  onDelete: (id: string) => void;
}

export default function FavoriteDetailSheet({ item, open, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<FavoriteCategory>("music");

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setSubtitle(item.subtitle ?? "");
      setNote(item.note ?? "");
      setRating(item.rating ?? 0);
      setCategory(item.category);
    }
  }, [item]);

  if (!item) return null;

  const cat = getCategoryMeta(item.category);

  const handleSave = () => {
    onSave({
      id: item.id,
      title,
      subtitle: subtitle || null,
      note: note || null,
      rating: rating || null,
      category,
    });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{cat.emoji} Eintrag bearbeiten</SheetTitle>
          <SheetDescription>Details ergänzen oder ändern</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Titel</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Künstler / Autor / Details
            </label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="z.B. Regisseur, Band, Autor…"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategorie</label>
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bewertung</label>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setRating(rating === i + 1 ? 0 : i + 1)}>
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notiz</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Warum gefällt es dir?"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">
              Speichern
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                onDelete(item.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
