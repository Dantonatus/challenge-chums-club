import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Star } from "lucide-react";
import { Favorite, getCategoryMeta } from "@/lib/favorites/types";

interface Props {
  item: Favorite;
  onClick: () => void;
}

export default function FavoriteCard({ item, onClick }: Props) {
  const cat = getCategoryMeta(item.category);
  const ago = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: de });

  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-xl border bg-card p-4 hover:shadow-md transition-shadow flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{cat.emoji}</span>
        <span className="text-[10px] text-muted-foreground">{ago}</span>
      </div>
      <p className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</p>
      {item.subtitle && (
        <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
      )}
      {item.rating && (
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < item.rating! ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
      {item.note && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 italic">"{item.note}"</p>
      )}
    </button>
  );
}
