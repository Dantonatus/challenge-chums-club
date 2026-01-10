import { useState } from 'react';
import { Filter, SortAsc, SortDesc, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTags } from '@/hooks/useTags';
import { useProjects } from '@/hooks/useProjects';
import type { TaskPriority, Tag, Project } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

export type SortOption = 'priority' | 'due_date' | 'created_at' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface TaskFilters {
  priorities: TaskPriority[];
  tagIds: string[];
  projectIds: string[];
  hasDate: 'all' | 'with' | 'without';
}

export interface TaskSort {
  by: SortOption;
  direction: SortDirection;
}

interface TaskFilterBarProps {
  filters: TaskFilters;
  sort: TaskSort;
  onFiltersChange: (filters: TaskFilters) => void;
  onSortChange: (sort: TaskSort) => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'p1', label: 'P1 Dringend', color: 'hsl(0, 84%, 60%)' },
  { value: 'p2', label: 'P2 Hoch', color: 'hsl(25, 95%, 53%)' },
  { value: 'p3', label: 'P3 Mittel', color: 'hsl(47, 96%, 53%)' },
  { value: 'p4', label: 'P4 Niedrig', color: 'hsl(142, 71%, 45%)' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'priority', label: 'Priorität' },
  { value: 'due_date', label: 'Fälligkeitsdatum' },
  { value: 'created_at', label: 'Erstelldatum' },
  { value: 'title', label: 'Titel' },
];

/**
 * TaskFilterBar - Filter and Sort controls for task lists
 * - Priority filter (multi-select)
 * - Tags filter (multi-select)
 * - Project filter (multi-select)
 * - Sort by priority/date/title
 */
export function TaskFilterBar({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
}: TaskFilterBarProps) {
  const { data: tags = [] } = useTags();
  const { data: projects = [] } = useProjects('active');

  const activeFiltersCount =
    filters.priorities.length +
    filters.tagIds.length +
    filters.projectIds.length +
    (filters.hasDate !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    onFiltersChange({
      priorities: [],
      tagIds: [],
      projectIds: [],
      hasDate: 'all',
    });
  };

  const togglePriority = (priority: TaskPriority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  const toggleTag = (tagId: string) => {
    const newTagIds = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter((id) => id !== tagId)
      : [...filters.tagIds, tagId];
    onFiltersChange({ ...filters, tagIds: newTagIds });
  };

  const toggleProject = (projectId: string) => {
    const newProjectIds = filters.projectIds.includes(projectId)
      ? filters.projectIds.filter((id) => id !== projectId)
      : [...filters.projectIds, projectId];
    onFiltersChange({ ...filters, projectIds: newProjectIds });
  };

  const toggleSortDirection = () => {
    onSortChange({
      ...sort,
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={activeFiltersCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  'ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs',
                  activeFiltersCount > 0 && 'bg-primary-foreground text-primary'
                )}
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0">
          <ScrollArea className="max-h-[400px]">
            <div className="p-4 space-y-4">
              {/* Priority Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">Priorität</h4>
                <div className="space-y-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.priorities.includes(option.value)}
                        onCheckedChange={() => togglePriority(option.value)}
                      />
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags Filter */}
              {tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tags</h4>
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.tagIds.includes(tag.id)}
                          onCheckedChange={() => toggleTag(tag.id)}
                        />
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color || 'hsl(var(--primary))' }}
                        />
                        <span className="text-sm truncate">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Filter */}
              {projects.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Projekte</h4>
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.projectIds.includes(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                        />
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: project.color || 'hsl(var(--muted))' }}
                        />
                        <span className="text-sm truncate">{project.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Has Date Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">Fälligkeitsdatum</h4>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'Alle' },
                    { value: 'with', label: 'Mit Datum' },
                    { value: 'without', label: 'Ohne Datum' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.hasDate === option.value}
                        onCheckedChange={() =>
                          onFiltersChange({
                            ...filters,
                            hasDate: option.value as 'all' | 'with' | 'without',
                          })
                        }
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Clear All */}
          {activeFiltersCount > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="w-full justify-center text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Filter zurücksetzen
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Active Filter Chips */}
      {filters.priorities.length > 0 && (
        <Badge variant="secondary" className="gap-1 pr-1">
          {filters.priorities.length} Priorität{filters.priorities.length > 1 && 'en'}
          <button
            onClick={() => onFiltersChange({ ...filters, priorities: [] })}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.tagIds.length > 0 && (
        <Badge variant="secondary" className="gap-1 pr-1">
          {filters.tagIds.length} Tag{filters.tagIds.length > 1 && 's'}
          <button
            onClick={() => onFiltersChange({ ...filters, tagIds: [] })}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.projectIds.length > 0 && (
        <Badge variant="secondary" className="gap-1 pr-1">
          {filters.projectIds.length} Projekt{filters.projectIds.length > 1 && 'e'}
          <button
            onClick={() => onFiltersChange({ ...filters, projectIds: [] })}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2">
            {sort.direction === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
            {SORT_OPTIONS.find((o) => o.value === sort.by)?.label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange({ ...sort, by: option.value })}
              className={cn(sort.by === option.value && 'bg-secondary')}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleSortDirection}>
            {sort.direction === 'asc' ? (
              <>
                <SortDesc className="h-4 w-4 mr-2" />
                Absteigend
              </>
            ) : (
              <>
                <SortAsc className="h-4 w-4 mr-2" />
                Aufsteigend
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}