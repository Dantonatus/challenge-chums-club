import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Favorite, FavoriteCategory } from "@/lib/favorites/types";

const TABLE = "favorites";
const KEY = ["favorites"];

export function useFavorites() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as Favorite[];
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Favorite[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: { title: string; category: FavoriteCategory }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from(TABLE).insert({
        user_id: user.id,
        title: input.title,
        category: input.category,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const update = useMutation({
    mutationFn: async (input: Partial<Favorite> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase
        .from(TABLE)
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return { favorites: query.data ?? [], isLoading: query.isLoading, add, update, remove };
}
