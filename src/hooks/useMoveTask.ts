import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string | null }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tasks')
        .update({ project_id: projectId })
        .eq('id', taskId);

      if (error) throw error;

      // Audit log
      await supabase.from('task_audit_log').insert({
        entity_type: 'task',
        entity_id: taskId,
        action: 'moved',
        payload_json: { project_id: projectId },
        user_id: user.user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Task verschoben');
    },
    onError: (error) => {
      toast.error('Fehler beim Verschieben: ' + error.message);
    },
  });
}
