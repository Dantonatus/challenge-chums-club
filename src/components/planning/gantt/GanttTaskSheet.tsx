import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { GanttTask } from '@/lib/planning/types';
import { useGanttTasks } from '@/hooks/useGanttTasks';

interface GanttTaskSheetProps {
  task: GanttTask | null;
  projectId: string;
  onClose: () => void;
  /** If true, open sheet in "create" mode */
  isNew?: boolean;
}

export function GanttTaskSheet({ task, projectId, onClose, isNew }: GanttTaskSheetProps) {
  const { createTask, updateTask, deleteTask } = useGanttTasks(projectId);
  const [showDelete, setShowDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStartDate(task.start_date);
      setEndDate(task.end_date);
      setDescription(task.description || '');
      setColor(task.color || '');
      setIsCompleted(task.is_completed);
    } else if (isNew) {
      setTitle('');
      setStartDate('');
      setEndDate('');
      setDescription('');
      setColor('');
      setIsCompleted(false);
    }
  }, [task, isNew]);

  const open = !!task || !!isNew;

  const handleSave = async () => {
    if (!title || !startDate || !endDate) return;

    if (isNew) {
      await createTask.mutateAsync({
        project_id: projectId,
        title,
        start_date: startDate,
        end_date: endDate,
        description: description || undefined,
        color: color || undefined,
        is_completed: isCompleted,
      });
    } else if (task) {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        start_date: startDate,
        end_date: endDate,
        description: description || undefined,
        color: color || undefined,
        is_completed: isCompleted,
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    setShowDelete(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={() => onClose()}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isNew ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-6">
            {!isNew && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox id="task-done" checked={isCompleted} onCheckedChange={(v) => setIsCompleted(!!v)} />
                <Label htmlFor="task-done" className="cursor-pointer">Erledigt</Label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Aufgabenname" />
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
              <Label>Farbe (optional)</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={color || '#3B82F6'} onChange={e => setColor(e.target.value)} className="w-12 h-9 p-1" />
                <Input value={color} onChange={e => setColor(e.target.value)} placeholder="z.B. #3B82F6" className="flex-1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notizen..." rows={3} />
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
            <Button onClick={handleSave} disabled={createTask.isPending || updateTask.isPending}>
              {isNew ? 'Erstellen' : 'Speichern'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aufgabe löschen?</AlertDialogTitle>
            <AlertDialogDescription>„{task?.title}" wird unwiderruflich gelöscht.</AlertDialogDescription>
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
