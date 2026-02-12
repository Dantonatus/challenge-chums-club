import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Subtask } from '@/lib/tasks/types';

const TASKS_KEY = ['tasks'];

// Create subtask
export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      title,
    }: {
      taskId: string;
      title: string;
    }) => {
      // Get current max sort_order
      const { data: existingSubtasks } = await supabase
        .from('subtasks')
        .select('sort_order')
        .eq('task_id', taskId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = existingSubtasks?.[0]?.sort_order
        ? existingSubtasks[0].sort_order + 1
        : 0;

      const { data, error } = await supabase
        .from('subtasks')
        .insert({
          task_id: taskId,
          title,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Subtask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen: ' + error.message);
    },
  });
}

// Update subtask (toggle done)
export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      done,
    }: {
      id: string;
      done: boolean;
    }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .update({ is_completed: done } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Subtask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });
}

// Delete subtask
export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen: ' + error.message);
    },
  });
}
