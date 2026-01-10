import { QuickAdd } from '@/components/tasks/QuickAdd';
import { TaskList } from '@/components/tasks/TaskList';
import { useTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TasksInbox() {
  const { data: tasks, isLoading } = useTasks({ 
    status: ['open', 'in_progress'] 
  });

  // Inbox: Tasks without due date AND priority P1-P3 (not P4)
  // P4 without date goes to Someday
  const inboxTasks = tasks?.filter(t => 
    !t.due_date && t.priority !== 'p4'
  ) || [];

  // Count of P4 tasks without date (they're in Someday)
  const somedayCount = tasks?.filter(t => 
    !t.due_date && t.priority === 'p4'
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground">
          Neue Aufgaben erfassen und später organisieren
        </p>
      </div>

      {/* Quick Add */}
      <QuickAdd placeholder="Was steht an?" />

      {/* Someday hint */}
      {somedayCount > 0 && (
        <Link to="/app/tasks/someday">
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 transition-colors hover:bg-amber-500/10">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <span className="text-sm">
              {somedayCount} {somedayCount === 1 ? 'Aufgabe wartet' : 'Aufgaben warten'} in "Irgendwann"
            </span>
          </div>
        </Link>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <TaskList 
            tasks={inboxTasks} 
            emptyType="inbox"
            showDueDate={false}
          />
          
          {inboxTasks.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Tipp: Aufgaben mit Priorität "Low" und ohne Datum erscheinen unter "Irgendwann"
            </p>
          )}
        </>
      )}
    </div>
  );
}