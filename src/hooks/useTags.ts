import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tag, CreateTagInput } from '@/lib/tasks/types';

const TAGS_KEY = ['tags'];

// Fetch all tags
export function useTags() {
  return useQuery({
    queryKey: TAGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Tag[];
    },
  });
}

// Create tag
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTagInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tags')
        .insert({
          ...input,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      toast.success('Tag created');
    },
    onError: (error) => {
      toast.error('Failed to create tag: ' + error.message);
    },
  });
}

// Delete tag
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      toast.success('Tag deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete tag: ' + error.message);
    },
  });
}
