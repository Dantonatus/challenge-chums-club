import { QuickAdd } from '@/components/tasks/QuickAdd';
import { TaskList } from '@/components/tasks/TaskList';
import { useTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';

export default function TasksInbox() {
  const { data: tasks, isLoading } = useTasks({ 
    status: ['open', 'in_progress'] 
  });

  // Filter to tasks without due date (true inbox) or all open tasks
  const inboxTasks = tasks?.filter(t => !t.due_date) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground">
          Capture tasks quickly, organize later
        </p>
      </div>

      {/* Quick Add */}
      <QuickAdd placeholder="What's on your mind?" />

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <TaskList 
          tasks={inboxTasks} 
          emptyType="inbox"
          showDueDate={false}
        />
      )}
    </div>
  );
}
