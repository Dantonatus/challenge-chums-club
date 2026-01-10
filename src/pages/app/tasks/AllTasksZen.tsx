import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskFilterBar, TaskFilters, TaskSort } from '@/components/tasks/TaskFilterBar';
import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

/**
 * Zen All Tasks View with FilterBar
 * - Filter by Priority, Tags, Projects
 * - Sort by priority/date/title
 * - Smart date-based grouping
 */

interface TaskSection {
  id: string;
  title: string;
  tasks: Task[];
  doneTasks: Task[];
  isOverdue?: boolean;
  icon?: React.ReactNode;
}

const DEFAULT_FILTERS: TaskFilters = {
  priorities: [],
  tagIds: [],
  projectIds: [],
  hasDate: 'all',
};

const DEFAULT_SORT: TaskSort = {
  by: 'priority',
  direction: 'asc',
};

export default function AllTasksZen() {
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<TaskSort>(DEFAULT_SORT);
  
  const { data: openTasks, isLoading: loadingOpen } = useTasks({ 
    status: ['open', 'in_progress'] 
  });
  const { data: doneTasks, isLoading: loadingDone } = useTasks({ 
    status: 'done' 
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Apply filters to tasks
  const filteredOpenTasks = useMemo(() => {
    if (!openTasks) return [];
    
    return openTasks.filter((task) => {
      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }
      
      // Tags filter (task must have at least one of the selected tags)
      if (filters.tagIds.length > 0) {
        const taskTagIds = task.tags?.map((t) => t.id) || [];
        if (!filters.tagIds.some((id) => taskTagIds.includes(id))) {
          return false;
        }
      }
      
      // Projects filter
      if (filters.projectIds.length > 0) {
        if (!task.project_id || !filters.projectIds.includes(task.project_id)) {
          return false;
        }
      }
      
      // Has date filter
      if (filters.hasDate === 'with' && !task.due_date) {
        return false;
      }
      if (filters.hasDate === 'without' && task.due_date) {
        return false;
      }
      
      return true;
    });
  }, [openTasks, filters]);

  // Apply filters to done tasks
  const filteredDoneTasks = useMemo(() => {
    if (!doneTasks) return [];
    
    return doneTasks.filter((task) => {
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }
      if (filters.tagIds.length > 0) {
        const taskTagIds = task.tags?.map((t) => t.id) || [];
        if (!filters.tagIds.some((id) => taskTagIds.includes(id))) {
          return false;
        }
      }
      if (filters.projectIds.length > 0) {
        if (!task.project_id || !filters.projectIds.includes(task.project_id)) {
          return false;
        }
      }
      if (filters.hasDate === 'with' && !task.due_date) {
        return false;
      }
      if (filters.hasDate === 'without' && task.due_date) {
        return false;
      }
      return true;
    });
  }, [doneTasks, filters]);

  // Sort function
  const sortTasks = (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => {
      let comparison = 0;
      
      switch (sort.by) {
        case 'priority': {
          const priorityOrder = { p1: 0, p2: 1, p3: 2, p4: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        }
        case 'due_date': {
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        }
        case 'created_at': {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        }
        case 'title': {
          comparison = a.title.localeCompare(b.title, 'de');
          break;
        }
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  };

  // Build sections
  const sections = useMemo<TaskSection[]>(() => {
    const now = new Date();
    const groups: Record<string, { tasks: Task[]; doneTasks: Task[] }> = {
      overdue: { tasks: [], doneTasks: [] },
      today: { tasks: [], doneTasks: [] },
      tomorrow: { tasks: [], doneTasks: [] },
      day2: { tasks: [], doneTasks: [] },
      day3: { tasks: [], doneTasks: [] },
      day4: { tasks: [], doneTasks: [] },
      day5: { tasks: [], doneTasks: [] },
      day6: { tasks: [], doneTasks: [] },
      later: { tasks: [], doneTasks: [] },
      noDate: { tasks: [], doneTasks: [] },
    };

    // Categorize filtered open tasks
    filteredOpenTasks.forEach((task) => {
      if (!task.due_date) {
        groups.noDate.tasks.push(task);
        return;
      }

      const dueDate = parseISO(task.due_date);

      if (isPast(dueDate) && !isToday(dueDate)) {
        groups.overdue.tasks.push(task);
      } else if (isToday(dueDate)) {
        groups.today.tasks.push(task);
      } else if (isTomorrow(dueDate)) {
        groups.tomorrow.tasks.push(task);
      } else {
        for (let i = 2; i <= 6; i++) {
          const targetDate = addDays(now, i);
          if (format(dueDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd')) {
            groups[`day${i}`].tasks.push(task);
            return;
          }
        }
        groups.later.tasks.push(task);
      }
    });

    // Categorize filtered done tasks
    filteredDoneTasks.forEach((task) => {
      if (!task.due_date) {
        groups.noDate.doneTasks.push(task);
        return;
      }

      const dueDate = parseISO(task.due_date);

      if (isPast(dueDate) && !isToday(dueDate)) {
        groups.overdue.doneTasks.push(task);
      } else if (isToday(dueDate)) {
        groups.today.doneTasks.push(task);
      } else if (isTomorrow(dueDate)) {
        groups.tomorrow.doneTasks.push(task);
      } else {
        for (let i = 2; i <= 6; i++) {
          const targetDate = addDays(now, i);
          if (format(dueDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd')) {
            groups[`day${i}`].doneTasks.push(task);
            return;
          }
        }
        groups.later.doneTasks.push(task);
      }
    });

    // Build sections with sorting
    const result: TaskSection[] = [];

    if (groups.overdue.tasks.length > 0 || groups.overdue.doneTasks.length > 0) {
      result.push({
        id: 'overdue',
        title: 'Überfällig',
        tasks: sortTasks(groups.overdue.tasks),
        doneTasks: groups.overdue.doneTasks,
        isOverdue: true,
        icon: <AlertCircle className="h-5 w-5 text-destructive" />,
      });
    }

    if (groups.today.tasks.length > 0 || groups.today.doneTasks.length > 0) {
      result.push({
        id: 'today',
        title: 'Heute',
        tasks: sortTasks(groups.today.tasks),
        doneTasks: groups.today.doneTasks,
      });
    }

    if (groups.tomorrow.tasks.length > 0 || groups.tomorrow.doneTasks.length > 0) {
      result.push({
        id: 'tomorrow',
        title: 'Morgen',
        tasks: sortTasks(groups.tomorrow.tasks),
        doneTasks: groups.tomorrow.doneTasks,
      });
    }

    // Days 2-6
    for (let i = 2; i <= 6; i++) {
      const key = `day${i}`;
      if (groups[key].tasks.length > 0 || groups[key].doneTasks.length > 0) {
        const targetDate = addDays(now, i);
        result.push({
          id: key,
          title: format(targetDate, 'EEEE, d. MMM', { locale: de }),
          tasks: sortTasks(groups[key].tasks),
          doneTasks: groups[key].doneTasks,
          icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
        });
      }
    }

    if (groups.later.tasks.length > 0 || groups.later.doneTasks.length > 0) {
      result.push({
        id: 'later',
        title: 'Später',
        tasks: sortTasks(groups.later.tasks),
        doneTasks: groups.later.doneTasks,
      });
    }

    if (groups.noDate.tasks.length > 0 || groups.noDate.doneTasks.length > 0) {
      result.push({
        id: 'noDate',
        title: 'Ohne Datum',
        tasks: sortTasks(groups.noDate.tasks),
        doneTasks: groups.noDate.doneTasks,
      });
    }

    return result;
  }, [filteredOpenTasks, filteredDoneTasks, sort]);

  const isLoading = loadingOpen || loadingDone;
  const hasActiveFilters = 
    filters.priorities.length > 0 || 
    filters.tagIds.length > 0 || 
    filters.projectIds.length > 0 ||
    filters.hasDate !== 'all';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalOpen = filteredOpenTasks.length;
  const totalAll = openTasks?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Alle Aufgaben</h1>
        <p className="text-lg text-muted-foreground mt-1">
          {hasActiveFilters ? (
            <>
              {totalOpen} von {totalAll} angezeigt
            </>
          ) : (
            <>
              {totalOpen} offen
            </>
          )}
        </p>
      </header>

      {/* Filter Bar */}
      <TaskFilterBar
        filters={filters}
        sort={sort}
        onFiltersChange={setFilters}
        onSortChange={setSort}
      />

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-2xl">{hasActiveFilters ? '🔍' : '🎉'}</span>
          </div>
          <p className="text-lg text-muted-foreground">
            {hasActiveFilters ? 'Keine Aufgaben gefunden' : 'Alles erledigt!'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveFilters
              ? 'Versuche andere Filter'
              : 'Tippe auf + um eine neue Aufgabe hinzuzufügen'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id}>
              <div className="flex items-center gap-2 mb-3">
                {section.icon}
                <h2
                  className={cn(
                    'text-lg font-semibold',
                    section.isOverdue && 'text-destructive'
                  )}
                >
                  {section.title}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({section.tasks.length})
                </span>
              </div>
              <TaskListZen 
                tasks={section.tasks} 
                doneTasks={section.doneTasks}
                onEdit={setEditingTask}
                showDoneToggle={section.doneTasks.length > 0}
              />
            </section>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <TaskDetailSheet
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />
    </div>
  );
}