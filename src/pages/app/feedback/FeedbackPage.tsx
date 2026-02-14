import { useState } from 'react';
import { useFeedbackEmployees } from '@/hooks/useFeedbackEmployees';
import { useFeedbackEntries } from '@/hooks/useFeedbackEntries';
import { useFeedbackSessions } from '@/hooks/useFeedbackSessions';
import { EmployeeList } from '@/components/feedback/EmployeeList';
import { FeedbackTimeline } from '@/components/feedback/FeedbackTimeline';
import { toast } from '@/hooks/use-toast';

const FeedbackPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { employees, create: createEmp, update: updateEmp } = useFeedbackEmployees();
  const { entries, archivedEntries, create: createEntry, update: updateEntry, remove: removeEntry, isLoading } = useFeedbackEntries(selectedId);
  const { sessions, create: createSession, remove: removeSession } = useFeedbackSessions(selectedId);

  const selectedEmployee = employees.find(e => e.id === selectedId) ?? null;

  const handleCreateEmployee = (data: { name: string; role?: string; color: string }) => {
    createEmp.mutate(data, {
      onSuccess: (emp) => setSelectedId(emp.id),
      onError: () => toast({ title: 'Fehler', description: 'Mitarbeiter konnte nicht angelegt werden.', variant: 'destructive' }),
    });
  };

  const handleCreateEntry = (entry: { employee_id: string; content: string; category: string; sentiment: string; entry_date: string }) => {
    createEntry.mutate(entry, {
      onError: () => toast({ title: 'Fehler', description: 'Eintrag konnte nicht gespeichert werden.', variant: 'destructive' }),
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <EmployeeList
        employees={employees}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={handleCreateEmployee}
      />
      <FeedbackTimeline
        employee={selectedEmployee}
        entries={entries}
        archivedEntries={archivedEntries}
        sessions={sessions}
        isLoading={isLoading}
        onCreateEntry={handleCreateEntry}
        isCreating={createEntry.isPending}
        onUpdateEntry={(id, content) => updateEntry.mutate({ id, content })}
        onDeleteEntry={(id) => removeEntry.mutate(id)}
        onUpdateEmployee={(data) => updateEmp.mutate(data)}
        onToggleArchive={(id, is_archived) => updateEmp.mutate({ id, is_archived })}
        onCreateSession={(data) => createSession.mutate(data, {
          onError: () => toast({ title: 'Fehler', description: 'Session konnte nicht erstellt werden.', variant: 'destructive' }),
        })}
        isCreatingSession={createSession.isPending}
        onDeleteSession={(id) => removeSession.mutate(id)}
      />
    </div>
  );
};

export default FeedbackPage;
