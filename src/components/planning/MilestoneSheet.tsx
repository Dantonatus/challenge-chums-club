import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MilestoneWithClient, 
  MILESTONE_TYPE_CONFIG, 
  MilestoneType,
  PRIORITY_CONFIG,
  MilestonePriority 
} from '@/lib/planning/types';
import { useMilestones } from '@/hooks/useMilestones';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Users, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MilestoneSheetProps {
  milestone: MilestoneWithClient | null;
  onClose: () => void;
}

export function MilestoneSheet({ milestone, onClose }: MilestoneSheetProps) {
  const { updateMilestone, deleteMilestone, toggleComplete } = useMilestones();
  const { clients } = useClients();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('general');
  const [priority, setPriority] = useState<MilestonePriority>('medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Sync form when milestone changes
  useEffect(() => {
    if (milestone) {
      setTitle(milestone.title);
      setClientId(milestone.client_id);
      setDate(milestone.date);
      setTime(milestone.time || '');
      setMilestoneType(milestone.milestone_type);
      setPriority(milestone.priority);
      setDescription(milestone.description || '');
      setLocation(milestone.location || '');
      setIsCompleted(milestone.is_completed);
    }
  }, [milestone]);

  const handleSave = async () => {
    if (!milestone) return;

    await updateMilestone.mutateAsync({
      id: milestone.id,
      title,
      client_id: clientId,
      date,
      time: time || undefined,
      milestone_type: milestoneType,
      priority,
      description: description || undefined,
      location: location || undefined,
      is_completed: isCompleted,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!milestone) return;
    await deleteMilestone.mutateAsync(milestone.id);
    setShowDeleteDialog(false);
    onClose();
  };

  const handleToggleComplete = async () => {
    if (!milestone) return;
    const newValue = !isCompleted;
    setIsCompleted(newValue);
    await toggleComplete.mutateAsync({ id: milestone.id, is_completed: newValue });
  };

  if (!milestone) return null;

  const typeConfig = MILESTONE_TYPE_CONFIG[milestone.milestone_type];

  return (
    <>
      <Sheet open={!!milestone} onOpenChange={() => onClose()}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: milestone.client?.color }}
              />
              Meilenstein bearbeiten
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Completed checkbox */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="completed"
                checked={isCompleted}
                onCheckedChange={handleToggleComplete}
              />
              <Label htmlFor="completed" className="flex-1 cursor-pointer">
                Als erledigt markieren
              </Label>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meilenstein-Titel"
              />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label>Kunde</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunde wählen" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: client.color }}
                        />
                        {client.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Datum
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Uhrzeit
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            {/* Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={milestoneType} onValueChange={(v) => setMilestoneType(v as MilestoneType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MILESTONE_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.labelDe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorität</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as MilestonePriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.labelDe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Ort
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Vor Ort, Online, München"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notizen zum Meilenstein..."
                rows={4}
              />
            </div>

            {/* Meta info */}
            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p>Erstellt: {format(new Date(milestone.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
              {milestone.completed_at && (
                <p>Erledigt: {format(new Date(milestone.completed_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
              )}
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Löschen
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateMilestone.isPending}
            >
              Speichern
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Meilenstein löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du "{milestone?.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
