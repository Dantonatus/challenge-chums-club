import { FeedbackEmployee, FeedbackEntry, FeedbackSession } from '@/lib/feedback/types';
import { FeedbackEntryCapture } from './FeedbackEntryCapture';
import { FeedbackEntryCard } from './FeedbackEntryCard';
import { FeedbackEmptyState } from './FeedbackEmptyState';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { StartSessionDialog } from './StartSessionDialog';
import { SessionCard } from './SessionCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Archive, ArchiveRestore, Pencil, MessageSquareText } from 'lucide-react';
import { useState } from 'react';

interface Props {
  employee: FeedbackEmployee | null;
  entries: FeedbackEntry[];
  archivedEntries: FeedbackEntry[];
  sessions: FeedbackSession[];
  isLoading: boolean;
  onCreateEntry: (entry: { employee_id: string; content: string; category: string; sentiment: string; entry_date: string }) => void;
  isCreating: boolean;
  onUpdateEntry: (id: string, content: string) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEmployee: (data: { id: string; name: string; role?: string | null; color: string }) => void;
  onToggleArchive: (id: string, is_archived: boolean) => void;
  onCreateSession: (data: { employee_id: string; session_date: string; notes?: string; entry_ids: string[] }) => void;
  isCreatingSession: boolean;
  onDeleteSession: (id: string) => void;
  onArchiveEntry: (entryId: string) => void;
}

export function FeedbackTimeline({
  employee, entries, archivedEntries, sessions, isLoading, onCreateEntry, isCreating,
  onUpdateEntry, onDeleteEntry, onUpdateEmployee, onToggleArchive,
  onCreateSession, isCreatingSession, onDeleteSession, onArchiveEntry,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  if (!employee) {
    return <FeedbackEmptyState hasEmployee={false} />;
  }

  const entriesBySession = (sessionId: string) =>
    archivedEntries.filter(e => e.session_id === sessionId);

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

      {/* Tabs */}
      <Tabs defaultValue="open" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-6 pt-2">
          <TabsList className="h-9">
            <TabsTrigger value="open" className="text-xs">Offen ({entries.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">Verlauf ({sessions.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* Open tab */}
        <TabsContent value="open" className="flex-1 overflow-y-auto p-6 mt-0 space-y-4">
          <FeedbackEntryCapture employeeId={employee.id} onSubmit={onCreateEntry} isSubmitting={isCreating} />

          {entries.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionDialogOpen(true)}
                className="gap-2"
              >
                <MessageSquareText className="h-4 w-4" />
                Feedbackrunde starten
              </Button>
            </div>
          )}

          {entries.length === 0 && !isLoading ? (
            <FeedbackEmptyState hasEmployee />
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <FeedbackEntryCard
                  key={entry.id}
                  entry={entry}
                  onToggleShared={() => {}}
                  onUpdate={onUpdateEntry}
                  onDelete={onDeleteEntry}
                  onArchive={onArchiveEntry}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="flex-1 overflow-y-auto p-6 mt-0 space-y-3">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquareText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Noch keine Feedbackrunden abgeschlossen.</p>
            </div>
          ) : (
            sessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                entries={entriesBySession(session.id)}
                onDelete={onDeleteSession}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} onSubmit={onUpdateEmployee} />

      <StartSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        entries={entries}
        onSubmit={(data) => {
          onCreateSession({ ...data, employee_id: employee.id });
          setSessionDialogOpen(false);
        }}
        isSubmitting={isCreatingSession}
      />
    </div>
  );
}
