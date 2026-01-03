import { useState, useRef, useEffect } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateTask } from '@/hooks/useTasks';
import { parseQuickAdd } from '@/lib/tasks/parser';
import { cn } from '@/lib/utils';

interface QuickAddProps {
  defaultProjectId?: string;
  className?: string;
  placeholder?: string;
}

export function QuickAdd({ defaultProjectId, className, placeholder }: QuickAddProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const parsed = parseQuickAdd(value);
    
    await createTask.mutateAsync({
      title: parsed.title,
      priority: parsed.priority,
      due_date: parsed.due_date,
      due_time: parsed.due_time,
      project_id: defaultProjectId,
    });

    setValue('');
  };

  // Keyboard shortcut: N to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative transition-all duration-200',
        isFocused && 'transform scale-[1.01]',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border-2 bg-card p-2 transition-all duration-200',
          isFocused
            ? 'border-primary shadow-lg shadow-primary/10'
            : 'border-border/50 hover:border-border'
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Plus className="h-4 w-4 text-primary" />
        </div>
        
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || 'Add a task... (try "tomorrow 14:00 P1 #work")'}
          className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
          aria-label="Quick add task"
        />

        <Button
          type="submit"
          size="sm"
          disabled={!value.trim() || createTask.isPending}
          className="rounded-lg"
        >
          {createTask.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <Sparkles className="mr-1 h-3 w-3" />
              Add
            </>
          )}
        </Button>
      </div>

      {isFocused && (
        <p className="mt-2 text-xs text-muted-foreground animate-in fade-in-50 slide-in-from-top-1">
          Tip: Use <kbd className="rounded bg-muted px-1">P1-P4</kbd> for priority,{' '}
          <kbd className="rounded bg-muted px-1">tomorrow</kbd> or{' '}
          <kbd className="rounded bg-muted px-1">next week</kbd> for dates
        </p>
      )}
    </form>
  );
}
