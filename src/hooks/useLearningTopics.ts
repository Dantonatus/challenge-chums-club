import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface LearningTopic {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  return userId;
}

export function useLearningTopics() {
  const userId = useUserId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["learning-topics", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_topics" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LearningTopic[];
    },
    enabled: !!userId,
  });

  const create = useMutation({
    mutationFn: async (topic: { name: string; emoji?: string; color?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("learning_topics" as any)
        .insert({ ...topic, user_id: auth.user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LearningTopic;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-topics"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LearningTopic> & { id: string }) => {
      const { error } = await supabase
        .from("learning_topics" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-topics"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("learning_topics" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-topics"] }),
  });

  return { topics: query.data || [], isLoading: query.isLoading, create, update, remove };
}
