import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths, format } from 'date-fns';
import type { 
  Task, 
  Subtask, 
  CreateTaskInput, 
  UpdateTaskInput, 
  TaskStatus,
  TaskPriority,
  RecurringFrequency
} from '@/lib/tasks/types';

const TASKS_KEY = ['tasks'];

// Fetch all tasks for current user
export function useTasks(filters?: {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
  project_id?: string;
  due_date?: string;
  due_before?: string;
  due_after?: string;
}) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*),
          subtasks(*),
          task_tags(tag_id, tags(*))
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          // Include 'todo' when 'open' is requested (DB uses 'todo' instead of 'open')
          const expanded = [...new Set(filters.status.flatMap(s => s === 'open' ? ['open', 'todo'] : s === 'todo' ? ['todo', 'open'] : [s]))];
          query = query.in('status', expanded);
        } else {
          const statuses = filters.status === 'open' ? ['open', 'todo'] : filters.status === 'todo' ? ['todo', 'open'] : [filters.status];
          query = query.in('status', statuses);
        }
      }
      
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      
      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      
      if (filters?.due_date) {
        query = query.eq('due_date', filters.due_date);
      }
      
      if (filters?.due_before) {
        query = query.lte('due_date', filters.due_before);
      }
      
      if (filters?.due_after) {
        query = query.gte('due_date', filters.due_after);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform task_tags to tags array
      return (data || []).map((task: any) => ({
        ...task,
        tags: task.task_tags?.map((tt: any) => tt.tags).filter(Boolean) || [],
        task_tags: undefined,
      })) as Task[];
    },
  });
}

// Fetch tasks for today - ONLY tasks with today's due date
export function useTodayTasks() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: [...TASKS_KEY, 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*),
          subtasks(*)
        `)
        .in('status', ['todo', 'open', 'in_progress'])
        .eq('due_date', today)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Task[];
    },
  });
}

// Fetch upcoming tasks (grouped by date)
export function useUpcomingTasks() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: [...TASKS_KEY, 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*)
        `)
        .in('status', ['todo', 'open', 'in_progress'])
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .order('priority', { ascending: true });

      if (error) throw error;
      
      // Separate overdue from upcoming
      const overdue: Task[] = [];
      const upcoming: Task[] = [];
      
      for (const task of (data || []) as Task[]) {
        if (task.due_date && task.due_date < today) {
          overdue.push(task);
        } else {
          upcoming.push(task);
        }
      }
      
      return { overdue, upcoming };
    },
  });
}

// Create task
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { tags, ...taskData } = input;
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Add tags if provided
      if (tags && tags.length > 0 && data) {
        const taskTags = tags.map(tag_id => ({
          task_id: data.id,
          tag_id,
        }));
        
        await supabase.from('task_tags').insert(taskTags);
      }
      
      // Audit log
      await supabase.from('task_audit_log').insert({
        entity_type: 'task',
        entity_id: data.id,
        action: 'created',
        payload_json: { title: data.title },
        user_id: user.user.id,
      });

      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      toast.success('Task created');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    },
  });
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTaskInput & { id: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // If marking as done, set completed_at
      if (updates.status === 'done') {
        (updates as any).completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Audit log
      await supabase.from('task_audit_log').insert({
        entity_type: 'task',
        entity_id: id,
        action: 'updated',
        payload_json: updates,
        user_id: user.user.id,
      });

      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    },
  });
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      toast.success('Task deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete task: ' + error.message);
    },
  });
}

/**
 * Calculate next due date based on recurrence frequency
 */
function getNextDueDate(currentDueDate: string | null, frequency: RecurringFrequency): string {
  const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
  
  switch (frequency) {
    case 'daily':
      return format(addDays(baseDate, 1), 'yyyy-MM-dd');
    case 'weekly':
      return format(addWeeks(baseDate, 1), 'yyyy-MM-dd');
    case 'monthly':
      return format(addMonths(baseDate, 1), 'yyyy-MM-dd');
    default:
      return format(baseDate, 'yyyy-MM-dd');
  }
}

// Mark task as done with undo option + auto-create next for recurring
export function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // First, get the full task data to check for recurrence
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Mark current task as done
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: 'done',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      let nextTaskId: string | null = null;
      
      // If recurring, create next occurrence
      if (existingTask.recurring_frequency && existingTask.recurring_frequency !== 'none') {
        const nextDueDate = getNextDueDate(existingTask.due_date, existingTask.recurring_frequency as RecurringFrequency);
        
        const { data: nextTask, error: nextError } = await supabase
          .from('tasks')
          .insert({
            title: existingTask.title,
            notes: existingTask.notes,
            priority: existingTask.priority,
            effort: existingTask.effort,
            project_id: existingTask.project_id,
            group_id: existingTask.group_id,
            recurring_frequency: existingTask.recurring_frequency,
            due_date: nextDueDate,
            due_time: existingTask.due_time,
            user_id: user.user.id,
            status: 'open',
          })
          .select()
          .single();
        
        if (!nextError && nextTask) {
          nextTaskId = nextTask.id;
          
          // Copy tags to new task
          const { data: taskTags } = await supabase
            .from('task_tags')
            .select('tag_id')
            .eq('task_id', id);
          
          if (taskTags && taskTags.length > 0) {
            await supabase.from('task_tags').insert(
              taskTags.map(tt => ({ task_id: nextTask.id, tag_id: tt.tag_id }))
            );
          }
          
          // Audit log for new task
          await supabase.from('task_audit_log').insert({
            entity_type: 'task',
            entity_id: nextTask.id,
            action: 'created_from_recurring',
            payload_json: { 
              original_task_id: id,
              next_due_date: nextDueDate,
              frequency: existingTask.recurring_frequency 
            },
            user_id: user.user.id,
          });
        }
      }
      
      // Audit log for completion
      await supabase.from('task_audit_log').insert({
        entity_type: 'task',
        entity_id: id,
        action: 'completed',
        payload_json: { title: data.title },
        user_id: user.user.id,
      });

      return { 
        task: data as Task, 
        taskId: id, 
        nextTaskId,
        isRecurring: existingTask.recurring_frequency !== 'none' && existingTask.recurring_frequency !== null
      };
    },
    onSuccess: ({ task, taskId, nextTaskId, isRecurring }) => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      
      if (isRecurring && nextTaskId) {
        // Special toast for recurring tasks
        toast.success('Erledigt! Nächste Wiederholung erstellt 🔄', {
          action: {
            label: 'Rückgängig',
            onClick: async () => {
              // Delete the new recurring task and restore original
              await supabase.from('tasks').delete().eq('id', nextTaskId);
              await supabase
                .from('tasks')
                .update({ status: 'open', completed_at: null })
                .eq('id', taskId);
              queryClient.invalidateQueries({ queryKey: TASKS_KEY });
              toast.success('Aufgabe wiederhergestellt');
            },
          },
          duration: 5000,
        });
      } else {
        // Regular toast with undo action
        toast.success('Aufgabe erledigt!', {
          action: {
            label: 'Rückgängig',
            onClick: async () => {
              await supabase
                .from('tasks')
                .update({ status: 'open', completed_at: null })
                .eq('id', taskId);
              queryClient.invalidateQueries({ queryKey: TASKS_KEY });
              toast.success('Aufgabe wiederhergestellt');
            },
          },
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      toast.error('Fehler: ' + error.message);
    },
  });
}

// Snooze task
export function useSnoozeTask() {
  const updateTask = useUpdateTask();
  
  return useMutation({
    mutationFn: async ({ id, due_date }: { id: string; due_date: string }) => {
      return updateTask.mutateAsync({ id, due_date });
    },
    onSuccess: () => {
      toast.success('Task snoozed');
    },
  });
}

// Restore task from done/archived to open
export function useRestoreTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: 'open',
          completed_at: null 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Audit log
      await supabase.from('task_audit_log').insert({
        entity_type: 'task',
        entity_id: id,
        action: 'restored',
        payload_json: { previous_status: 'done' },
        user_id: user.user.id,
      });

      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      toast.success('Task wiederhergestellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Wiederherstellen: ' + error.message);
    },
  });
}

// Archive task
export function useArchiveTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'archived' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Audit log
      await supabase.from('task_audit_log').insert({
        entity_type: 'task',
        entity_id: id,
        action: 'archived',
        payload_json: {},
        user_id: user.user.id,
      });

      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      toast.success('Task archiviert');
    },
    onError: (error) => {
      toast.error('Fehler beim Archivieren: ' + error.message);
    },
  });
}

// Move task to Someday (set P4 and remove date)
export function useMoveToSomeday() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          priority: 'p4',
          due_date: null,
          due_time: null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      toast.success('Task nach "Irgendwann" verschoben');
    },
    onError: (error) => {
      toast.error('Fehler: ' + error.message);
    },
  });
}
