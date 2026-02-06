import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MILESTONE_TYPE_CONFIG, 
  MilestoneType,
  CLIENT_COLORS 
} from '@/lib/planning/types';
import { useMilestones } from '@/hooks/useMilestones';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MilestoneQuickAdd({ open, onOpenChange }: MilestoneQuickAddProps) {
  const { createMilestone } = useMilestones();
  const { clients, createClient } = useClients();

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('general');
  const [location, setLocation] = useState('');

  const resetForm = () => {
    setTitle('');
    setClientId('');
    setNewClientName('');
    setShowNewClient(false);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime('');
    setMilestoneType('general');
    setLocation('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalClientId = clientId;

    // Create new client if needed
    if (showNewClient && newClientName.trim()) {
      const existingColors = clients.map(c => c.color);
      const availableColor = CLIENT_COLORS.find(c => !existingColors.includes(c)) || CLIENT_COLORS[0];
      
      const newClient = await createClient.mutateAsync({
        name: newClientName.trim(),
        color: availableColor,
      });
      finalClientId = newClient.id;
    }

    if (!finalClientId) return;

    await createMilestone.mutateAsync({
      title,
      client_id: finalClientId,
      date,
      time: time || undefined,
      milestone_type: milestoneType,
      location: location || undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  const isValid = title.trim() && (clientId || (showNewClient && newClientName.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuer Meilenstein</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="quick-title">Titel *</Label>
            <Input
              id="quick-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Kick-Off Meeting"
              autoFocus
            />
          </div>

          {/* Client selection */}
          <div className="space-y-2">
            <Label>Kunde *</Label>
            {!showNewClient ? (
              <div className="flex gap-2">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="flex-1">
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewClient(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Neuer Kundenname"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewClient(false);
                    setNewClientName('');
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quick-date">Datum *</Label>
              <Input
                id="quick-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-time">Uhrzeit</Label>
              <Input
                id="quick-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Typ</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MILESTONE_TYPE_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMilestoneType(key as MilestoneType)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all",
                    milestoneType === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {config.labelDe}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="quick-location">Ort (optional)</Label>
            <Input
              id="quick-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Vor Ort, Online"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || createMilestone.isPending || createClient.isPending}
            >
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
