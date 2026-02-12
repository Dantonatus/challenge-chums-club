import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlanningProject } from '@/lib/planning/types';
import { usePlanningProjects } from '@/hooks/useGanttTasks';

interface GanttProjectSheetProps {
  project: PlanningProject | null;
  clientId: string;
  onClose: () => void;
  isNew?: boolean;
}

export function GanttProjectSheet({ project, clientId, onClose, isNew }: GanttProjectSheetProps) {
  const { createProject, updateProject, deleteProject } = usePlanningProjects(clientId);
  const [showDelete, setShowDelete] = useState(false);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setStartDate(project.start_date);
      setEndDate(project.end_date || '');
      setDescription(project.description || '');
      setStatus(project.status);
    } else if (isNew) {
      setName('');
      setStartDate('');
      setEndDate('');
      setDescription('');
      setStatus('active');
    }
  }, [project, isNew]);

  const open = !!project || !!isNew;

  const handleSave = async () => {
    if (!name || !startDate) return;
    if (isNew) {
      await createProject.mutateAsync({
        client_id: clientId,
        name,
        start_date: startDate,
        end_date: endDate || undefined,
        description: description || undefined,
        status,
      });
    } else if (project) {
      await updateProject.mutateAsync({
        id: project.id,
        name,
        start_date: startDate,
        end_date: endDate || undefined,
        description: description || undefined,
        status,
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!project) return;
    await deleteProject.mutateAsync(project.id);
    setShowDelete(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={() => onClose()}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isNew ? 'Neues Projekt' : 'Projekt bearbeiten'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <Label>Projektname</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Projektname" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Enddatum</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="on_hold">Pausiert</SelectItem>
                  <SelectItem value="archived">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Projektbeschreibung..." rows={3} />
            </div>
          </div>

          <SheetFooter className="gap-2">
            {!isNew && (
              <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" />Löschen
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={createProject.isPending || updateProject.isPending}>
              {isNew ? 'Erstellen' : 'Speichern'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>„{project?.name}" und alle zugehörigen Aufgaben werden gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
