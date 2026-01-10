import { useState } from 'react';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Subtask } from '@/lib/tasks/types';

interface SubtaskListProps {
  subtasks: Subtask[];
  onAdd: (title: string) => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

/**
 * Subtask List Component
 * - Add new subtasks
 * - Toggle completion
 * - Delete subtasks
 */
export function SubtaskList({
  subtasks,
  onAdd,
  onToggle,
  onDelete,
  disabled = false,
}: SubtaskListProps) {
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newSubtask.trim()) return;
    onAdd(newSubtask.trim());
    setNewSubtask('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewSubtask('');
      setIsAdding(false);
    }
  };

  const completedCount = subtasks.filter((s) => s.done).length;
  const totalCount = subtasks.length;

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">
          Teilaufgaben
        </label>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} erledigt
          </span>
        )}
      </div>

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          {subtasks
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((subtask) => (
              <div
                key={subtask.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg group',
                  'bg-secondary/50 hover:bg-secondary transition-colors'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 cursor-grab" />
                <Checkbox
                  checked={subtask.done}
                  onCheckedChange={(checked) =>
                    onToggle(subtask.id, checked as boolean)
                  }
                  disabled={disabled}
                  className="h-5 w-5"
                />
                <span
                  className={cn(
                    'flex-1 text-sm',
                    subtask.done && 'line-through text-muted-foreground'
                  )}
                >
                  {subtask.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(subtask.id)}
                  disabled={disabled}
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Add subtask */}
      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Neue Teilaufgabe..."
            className="h-10"
            autoFocus
            disabled={disabled}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newSubtask.trim() || disabled}
          >
            Hinzufügen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNewSubtask('');
              setIsAdding(false);
            }}
          >
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Teilaufgabe hinzufügen
        </Button>
      )}
    </div>
  );
}
