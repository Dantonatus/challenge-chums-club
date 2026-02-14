import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EMPLOYEE_COLORS } from '@/lib/feedback/constants';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { name: string; role?: string; color: string }) => void;
}

export function CreateEmployeeDialog({ open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [color, setColor] = useState(EMPLOYEE_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), role: role.trim() || undefined, color });
    setName('');
    setRole('');
    setColor(EMPLOYEE_COLORS[Math.floor(Math.random() * EMPLOYEE_COLORS.length)]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter anlegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp-name">Name *</Label>
            <Input id="emp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-role">Rolle / Position</Label>
            <Input id="emp-role" value={role} onChange={e => setRole(e.target.value)} placeholder="z.B. Frontend Developer" />
          </div>
          <div className="space-y-2">
            <Label>Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {EMPLOYEE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-all',
                    color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={!name.trim()}>Anlegen</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
