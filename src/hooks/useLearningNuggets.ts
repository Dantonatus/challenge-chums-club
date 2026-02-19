import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface LearningNugget {
  id: string;
  user_id: string;
  topic_id: string | null;
  title: string;
  summary: string | null;
  key_points: string[];
  content: string | null;
  source: string | null;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  return userId;
}

export function useLearningNuggets(topicId?: string | null, search?: string) {
  const userId = useUserId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["learning-nuggets", userId, topicId, search],
    queryFn: async () => {
      let q = supabase
        .from("learning_nuggets" as any)
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (topicId) {
        q = q.eq("topic_id", topicId);
      }

      if (search && search.trim()) {
        q = q.or(`title.ilike.%${search}%,summary.ilike.%${search}%,content.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        key_points: Array.isArray(d.key_points) ? d.key_points : [],
        tags: Array.isArray(d.tags) ? d.tags : [],
      })) as LearningNugget[];
    },
    enabled: !!userId,
  });

  const create = useMutation({
    mutationFn: async (nugget: Omit<LearningNugget, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("learning_nuggets" as any)
        .insert({ ...nugget, user_id: auth.user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LearningNugget;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-nuggets"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LearningNugget> & { id: string }) => {
      const { error } = await supabase
        .from("learning_nuggets" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-nuggets"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("learning_nuggets" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-nuggets"] }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from("learning_nuggets" as any)
        .update({ is_pinned } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-nuggets"] }),
  });

  return { nuggets: query.data || [], isLoading: query.isLoading, create, update, remove, togglePin };
}
