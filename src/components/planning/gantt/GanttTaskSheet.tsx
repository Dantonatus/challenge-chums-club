import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GanttTask, GanttTaskFormData } from '@/lib/planning/gantt-types';

interface GanttTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: GanttTask | null;
  projectId: string;
  onSave: (data: GanttTaskFormData) => void;
  onUpdate: (data: Partial<GanttTaskFormData> & { id: string; is_completed?: boolean }) => void;
  onDelete: (id: string) => void;
}

export function GanttTaskSheet({
  open,
  onOpenChange,
  task,
  projectId,
  onSave,
  onUpdate,
  onDelete,
}: GanttTaskSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [color, setColor] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStartDate(new Date(task.start_date));
      setEndDate(new Date(task.end_date));
      setColor(task.color || '');
    } else {
      setTitle('');
      setDescription('');
      setStartDate(undefined);
      setEndDate(undefined);
      setColor('');
    }
  }, [task, open]);

  const handleSubmit = () => {
    if (!title || !startDate || !endDate) return;

    const data: GanttTaskFormData = {
      title,
      project_id: projectId,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      description: description || undefined,
      color: color || undefined,
    };

    if (task) {
      onUpdate({ id: task.id, ...data });
    } else {
      onSave(data);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Analyse & Datenkonsolidierung" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startdatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd.MM.yyyy') : 'Wählen'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={de} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Enddatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd.MM.yyyy') : 'Wählen'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={de} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label>Beschreibung (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details zur Aufgabe..." rows={3} />
          </div>

          <div>
            <Label>Farbe (optional)</Label>
            <Input type="color" value={color || '#3B82F6'} onChange={(e) => setColor(e.target.value)} className="h-10 w-20" />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} className="flex-1" disabled={!title || !startDate || !endDate}>
              {task ? 'Speichern' : 'Erstellen'}
            </Button>
            {task && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  onDelete(task.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
