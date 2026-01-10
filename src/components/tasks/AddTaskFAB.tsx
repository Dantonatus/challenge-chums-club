import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddTaskModal } from './AddTaskModal';
import { cn } from '@/lib/utils';

interface AddTaskFABProps {
  defaultProjectId?: string;
  className?: string;
}

/**
 * Floating Action Button for adding tasks
 * - Always visible at bottom right on mobile
 * - Large touch target (56px)
 * - Single accent color
 */
export function AddTaskFAB({ defaultProjectId, className }: AddTaskFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
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

      <AddTaskModal
        open={isOpen}
        onOpenChange={setIsOpen}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
