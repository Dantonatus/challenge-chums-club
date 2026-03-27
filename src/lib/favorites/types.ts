export interface Favorite {
  id: string;
  user_id: string;
  category: FavoriteCategory;
  title: string;
  subtitle: string | null;
  rating: number | null;
  note: string | null;
  image_url: string | null;
  status: string;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type FavoriteCategory =
  | "music"
  | "movie"
  | "series"
  | "book"
  | "plant"
  | "game"
  | "restaurant"
  | "other";

export const CATEGORIES: {
  value: FavoriteCategory;
  label: string;
  emoji: string;
}[] = [
  { value: "music", label: "Musik", emoji: "🎵" },
  { value: "movie", label: "Filme", emoji: "🎬" },
  { value: "series", label: "Serien", emoji: "📺" },
  { value: "book", label: "Bücher", emoji: "📚" },
  { value: "plant", label: "Pflanzen", emoji: "🌱" },
  { value: "game", label: "Spiele", emoji: "🎮" },
  { value: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { value: "other", label: "Sonstiges", emoji: "✨" },
];

export const getCategoryMeta = (cat: string) =>
  CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
