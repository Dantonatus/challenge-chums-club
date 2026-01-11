import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AddTaskFABProps {
  defaultProjectId?: string;
  className?: string;
}

/**
 * Floating Action Button for adding tasks
 * - Scrolls to and focuses the QuickAdd input
 * - Falls back to top of page if QuickAdd not found
 */
export function AddTaskFAB({ className }: AddTaskFABProps) {
  const handleClick = () => {
    // Find the QuickAdd input and focus it
    const quickAddInput = document.querySelector('input[aria-label="Quick add task"]') as HTMLInputElement;
    
    if (quickAddInput) {
      // Scroll into view with some offset
      quickAddInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus after scroll completes
      setTimeout(() => {
        quickAddInput.focus();
      }, 300);
    } else {
      // Fallback: scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'h-14 w-14 rounded-full shadow-lg',
        'bg-primary hover:bg-primary/90 text-primary-foreground',
        'transition-transform duration-200 hover:scale-105 active:scale-95',
        'lg:bottom-8 lg:right-8',
        className
      )}
      aria-label="Neue Aufgabe hinzufügen"
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </Button>
  );
}