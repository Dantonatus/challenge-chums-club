// Task Planner types

export type TaskPriority = 'p1' | 'p2' | 'p3' | 'p4';
export type TaskStatus = 'open' | 'todo' | 'in_progress' | 'done' | 'archived';
export type TaskEffort = 'xs' | 's' | 'm' | 'l' | 'xl';
export type RecurringFrequency = 'none' | 'daily' | 'weekly' | 'monthly';
export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  effort: TaskEffort | null;
  project_id: string | null;
  user_id: string;
  group_id: string | null;
  recurring_frequency: RecurringFrequency;
  reminder_enabled: boolean;
  reminder_offset_minutes: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined data
  project?: Project | null;
  tags?: Tag[];
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  parent_id: string | null;
  sort_order: number;
  user_id: string;
  group_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  task_count?: number;
  completed_count?: number;
  children?: Project[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  tag_id: string;
}

export interface TaskAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_json: Record<string, unknown> | null;
  user_id: string;
  created_at: string;
}

// Form types
export interface CreateTaskInput {
  title: string;
  notes?: string;
  due_date?: string;
  due_time?: string;
  priority?: TaskPriority;
  effort?: TaskEffort;
  project_id?: string;
  group_id?: string;
  recurring_frequency?: RecurringFrequency;
  reminder_enabled?: boolean;
  reminder_offset_minutes?: number | null;
  tags?: string[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  group_id?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

// Priority labels
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  p1: 'Urgent',
  p2: 'High',
  p3: 'Medium',
  p4: 'Low',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  p1: 'hsl(0, 84%, 60%)',
  p2: 'hsl(25, 95%, 53%)',
  p3: 'hsl(47, 96%, 53%)',
  p4: 'hsl(142, 71%, 45%)',
};

export const EFFORT_LABELS: Record<TaskEffort, string> = {
  xs: '15min',
  s: '30min',
  m: '1h',
  l: '2h',
  xl: '4h+',
};

// Reminder offset options
export const REMINDER_OFFSETS: { value: number | null; label: string }[] = [
  { value: null, label: 'Zur Fälligkeit' },
  { value: 15, label: '15 Min vorher' },
  { value: 30, label: '30 Min vorher' },
  { value: 60, label: '1 Std vorher' },
  { value: 1440, label: '1 Tag vorher' },
];