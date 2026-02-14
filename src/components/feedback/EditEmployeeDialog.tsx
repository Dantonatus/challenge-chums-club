import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EMPLOYEE_COLORS } from '@/lib/feedback/constants';
import { FeedbackEmployee } from '@/lib/feedback/types';
import { cn } from '@/lib/utils';

interface Props {
  employee: FeedbackEmployee | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { id: string; name: string; role?: string | null; color: string }) => void;
}

export function EditEmployeeDialog({ employee, open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [color, setColor] = useState(EMPLOYEE_COLORS[0]);

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setRole(employee.role ?? '');
      setColor(employee.color);
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !name.trim()) return;
    onSubmit({ id: employee.id, name: name.trim(), role: role.trim() || null, color });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Rolle / Position</Label>
            <Input id="edit-role" value={role} onChange={e => setRole(e.target.value)} />
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
            <Button type="submit" disabled={!name.trim()}>Speichern</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
