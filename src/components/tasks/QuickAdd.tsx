import { useState, useRef, useEffect } from 'react';
import { Plus, Sparkles, ChevronDown, ChevronUp, Tag, Repeat, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTask } from '@/hooks/useTasks';
import { useTags, useCreateTag } from '@/hooks/useTags';
import { parseQuickAdd } from '@/lib/tasks/parser';
import { cn } from '@/lib/utils';
import type { TaskPriority, RecurringFrequency } from '@/lib/tasks/types';

interface QuickAddProps {
  defaultProjectId?: string;
  defaultPriority?: TaskPriority;
  className?: string;
  placeholder?: string;
}

const RECURRENCE_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'none', label: 'Nicht wiederholen' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
];

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function QuickAdd({ defaultProjectId, defaultPriority, className, placeholder }: QuickAddProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurringFrequency>('none');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const { data: allTags } = useTags();
  const createTag = useCreateTag();

  const selectedTags = allTags?.filter((t) => selectedTagIds.includes(t.id)) || [];
  const availableTags = allTags?.filter((t) => !selectedTagIds.includes(t.id)) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const parsed = parseQuickAdd(value);
    
    await createTask.mutateAsync({
      title: parsed.title,
      priority: parsed.priority || defaultPriority,
      due_date: parsed.due_date,
      due_time: parsed.due_time,
      project_id: defaultProjectId,
      recurring_frequency: recurrence,
      tags: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    });

    // Reset form
    setValue('');
    setSelectedTagIds([]);
    setRecurrence('none');
    setShowExtras(false);
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const newTag = await createTag.mutateAsync({
      name: newTagName.trim(),
      color: newTagColor,
    });
    setSelectedTagIds([...selectedTagIds, newTag.id]);
    setNewTagName('');
    setIsCreatingTag(false);
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

  const hasExtras = selectedTagIds.length > 0 || recurrence !== 'none';

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
          'rounded-xl border-2 bg-card transition-all duration-200',
          isFocused
            ? 'border-primary shadow-lg shadow-primary/10'
            : 'border-border/50 hover:border-border'
        )}
      >
        {/* Main input row */}
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder || 'Aufgabe hinzufügen... (z.B. "morgen 14:00 P1 #arbeit")'}
            className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
            aria-label="Quick add task"
          />

          {/* Expand button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowExtras(!showExtras)}
            className={cn(
              'h-8 w-8 shrink-0',
              hasExtras && 'text-primary'
            )}
          >
            {showExtras ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

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

        {/* Extras panel */}
        {showExtras && (
          <div className="border-t border-border/50 p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Tags row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              
              {/* Selected tags */}
              {selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="pl-2 pr-1 py-0.5 gap-1 text-xs"
                  style={{ 
                    borderColor: tag.color || 'hsl(var(--border))',
                    backgroundColor: `${tag.color}15`
                  }}
                >
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || 'hsl(var(--muted))' }}
                  />
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className="ml-0.5 p-0.5 rounded hover:bg-secondary"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {/* Add tag popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Label
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  {isCreatingTag ? (
                    <div className="space-y-2">
                      <Input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Label-Name"
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateTag();
                          }
                          if (e.key === 'Escape') setIsCreatingTag(false);
                        }}
                      />
                      <div className="flex gap-1">
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            className={cn(
                              'h-5 w-5 rounded-full transition-transform',
                              newTagColor === color && 'ring-2 ring-offset-1 ring-primary'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateTag}
                          disabled={!newTagName.trim() || createTag.isPending}
                          className="flex-1 h-7 text-xs"
                        >
                          Erstellen
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsCreatingTag(false)}
                          className="h-7 text-xs"
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {availableTags.length > 0 && (
                        <div className="max-h-36 overflow-y-auto space-y-0.5">
                          {availableTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleToggleTag(tag.id)}
                              className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-secondary text-left"
                            >
                              <div
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: tag.color || 'hsl(var(--muted))' }}
                              />
                              <span className="text-sm">{tag.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreatingTag(true)}
                        className="w-full h-7 text-xs text-muted-foreground"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Neues Label
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Recurrence row */}
            <div className="flex items-center gap-2">
              <Repeat className={cn(
                'h-4 w-4 shrink-0',
                recurrence !== 'none' ? 'text-primary' : 'text-muted-foreground'
              )} />
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurringFrequency)}>
                <SelectTrigger className="h-8 w-[180px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {isFocused && !showExtras && (
        <p className="mt-2 text-xs text-muted-foreground animate-in fade-in-50 slide-in-from-top-1">
          Tipp: <kbd className="rounded bg-muted px-1">P1-P4</kbd> für Priorität,{' '}
          <kbd className="rounded bg-muted px-1">morgen</kbd> oder{' '}
          <kbd className="rounded bg-muted px-1">nächste Woche</kbd> für Datum,{' '}
          <kbd className="rounded bg-muted px-1">↓</kbd> für mehr Optionen
        </p>
      )}
    </form>
  );
}
