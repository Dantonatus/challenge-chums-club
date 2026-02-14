import { useState, useMemo } from 'react';
import { FeedbackEmployee, FeedbackEntry } from '@/lib/feedback/types';
import { EmployeeCard } from './EmployeeCard';
import { CreateEmployeeDialog } from './CreateEmployeeDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  employees: FeedbackEmployee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (data: { name: string; role?: string; color: string }) => void;
  allEntries?: Map<string, FeedbackEntry[]>;
}

export function EmployeeList({ employees, selectedId, onSelect, onCreate, allEntries }: Props) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(q) || (e.role ?? '').toLowerCase().includes(q));
  }, [employees, search]);

  const active = filtered.filter(e => !e.is_archived);
  const archived = filtered.filter(e => e.is_archived);

  const getUnsharedCount = (empId: string) => {
    const entries = allEntries?.get(empId);
    return entries?.filter(e => !e.is_shared).length ?? 0;
  };

  return (
    <div className="flex h-full w-60 flex-col border-r border-border bg-card/50">
      {/* Header */}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Mitarbeiter</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Active employees */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {active.map(emp => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            isSelected={emp.id === selectedId}
            unsharedCount={getUnsharedCount(emp.id)}
            onClick={() => onSelect(emp.id)}
          />
        ))}
        {active.length === 0 && !search && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            Noch keine Mitarbeiter angelegt
          </div>
        )}
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 border-t border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-3 w-3 transition-transform ${archivedOpen ? 'rotate-0' : '-rotate-90'}`} />
            Archiviert ({archived.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 px-2 pb-2">
            {archived.map(emp => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                isSelected={emp.id === selectedId}
                unsharedCount={getUnsharedCount(emp.id)}
                onClick={() => onSelect(emp.id)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={onCreate} />
    </div>
  );
}
