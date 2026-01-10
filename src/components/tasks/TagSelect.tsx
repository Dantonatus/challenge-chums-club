import { useState } from 'react';
import { Tag as TagIcon, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTags, useCreateTag } from '@/hooks/useTags';
import type { Tag } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

interface TagSelectProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

/**
 * Tag Select Component
 * - Select from existing tags
 * - Create new tags inline
 * - Color picker for new tags
 */
export function TagSelect({
  selectedTagIds,
  onChange,
  disabled = false,
}: TagSelectProps) {
  const { data: allTags } = useTags();
  const createTag = useCreateTag();
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const selectedTags = allTags?.filter((t) => selectedTagIds.includes(t.id)) || [];
  const availableTags = allTags?.filter((t) => !selectedTagIds.includes(t.id)) || [];

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const newTag = await createTag.mutateAsync({
      name: newTagName.trim(),
      color: newTagColor,
    });

    onChange([...selectedTagIds, newTag.id]);
    setNewTagName('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">Labels</label>

      {/* Selected tags */}
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="pl-2 pr-1 py-1 gap-1"
            style={{ 
              borderColor: tag.color || 'hsl(var(--border))',
              backgroundColor: `${tag.color}15` || 'transparent'
            }}
          >
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: tag.color || 'hsl(var(--muted))' }}
            />
            <span>{tag.name}</span>
            <button
              onClick={() => handleToggleTag(tag.id)}
              disabled={disabled}
              className="ml-1 p-0.5 rounded hover:bg-secondary"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {/* Add tag button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-7 px-2 text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Label
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            {isCreating ? (
              <div className="space-y-3">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Label-Name"
                  className="h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTag();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                />
                <div className="flex gap-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={cn(
                        'h-6 w-6 rounded-full transition-transform',
                        newTagColor === color && 'ring-2 ring-offset-2 ring-primary'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || createTag.isPending}
                    className="flex-1"
                  >
                    Erstellen
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsCreating(false)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTags.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-secondary text-left"
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || 'hsl(var(--muted))' }}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Keine Labels vorhanden
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                  className="w-full text-muted-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Neues Label
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
