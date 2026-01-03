import { Inbox, CheckSquare, Calendar, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskEmptyStateProps {
  type: 'inbox' | 'today' | 'upcoming' | 'project';
  className?: string;
}

const EMPTY_STATES = {
  inbox: {
    icon: Inbox,
    title: 'Your inbox is empty',
    description: 'Capture tasks quickly – they\'ll appear here until you organize them.',
  },
  today: {
    icon: CheckSquare,
    title: 'Nothing due today',
    description: 'Take a break or get ahead on tomorrow\'s tasks.',
  },
  upcoming: {
    icon: Calendar,
    title: 'No upcoming tasks',
    description: 'Schedule tasks with due dates to see them here.',
  },
  project: {
    icon: FolderKanban,
    title: 'No tasks in this project',
    description: 'Add tasks to organize your project work.',
  },
};

export function TaskEmptyState({ type, className }: TaskEmptyStateProps) {
  const { icon: Icon, title, description } = EMPTY_STATES[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
