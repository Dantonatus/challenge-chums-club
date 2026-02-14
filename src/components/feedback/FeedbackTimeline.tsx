import { FeedbackEmployee, FeedbackEntry } from '@/lib/feedback/types';
import { FeedbackEntryCapture } from './FeedbackEntryCapture';
import { FeedbackEntryCard } from './FeedbackEntryCard';
import { FeedbackEmptyState } from './FeedbackEmptyState';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { Button } from '@/components/ui/button';
import { Archive, ArchiveRestore, Pencil } from 'lucide-react';
import { useState } from 'react';

interface Props {
  employee: FeedbackEmployee | null;
  entries: FeedbackEntry[];
  isLoading: boolean;
  onCreateEntry: (entry: { employee_id: string; content: string; category: string; sentiment: string; entry_date: string }) => void;
  isCreating: boolean;
  onToggleShared: (id: string, is_shared: boolean) => void;
  onUpdateEntry: (id: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEmployee: (data: { id: string; name: string; role?: string | null; color: string }) => void;
  onToggleArchive: (id: string, is_archived: boolean) => void;
}

export function FeedbackTimeline({
  employee, entries, isLoading, onCreateEntry, isCreating,
  onToggleShared, onUpdateEntry, onDeleteEntry, onUpdateEmployee, onToggleArchive,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);

  if (!employee) {
    return <FeedbackEmptyState hasEmployee={false} />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Employee header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: employee.color }}
          >
            {employee.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{employee.name}</h2>
            {employee.role && <p className="text-sm text-muted-foreground">{employee.role}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggleArchive(employee.id, !employee.is_archived)}
            title={employee.is_archived ? 'Wiederherstellen' : 'Archivieren'}
          >
            {employee.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <FeedbackEntryCapture employeeId={employee.id} onSubmit={onCreateEntry} isSubmitting={isCreating} />

        {entries.length === 0 && !isLoading ? (
          <FeedbackEmptyState hasEmployee />
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <FeedbackEntryCard
                key={entry.id}
                entry={entry}
                onToggleShared={onToggleShared}
                onUpdate={onUpdateEntry}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        )}
      </div>

      <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} onSubmit={onUpdateEmployee} />
    </div>
  );
}
