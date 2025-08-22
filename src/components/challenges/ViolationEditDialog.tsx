import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ViolationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateViolation: (violationId: string, amountCents: number, date: Date) => Promise<void>;
  onDeleteViolation: (violationId: string) => Promise<void>;
  violation: {
    id: string;
    amount_cents: number;
    created_at: string;
  } | null;
}

export function ViolationEditDialog({ 
  open, 
  onOpenChange, 
  onUpdateViolation,
  onDeleteViolation,
  violation 
}: ViolationEditDialogProps) {
  const [amountCents, setAmountCents] = useState(violation?.amount_cents || 0);
  const [violationDate, setViolationDate] = useState<Date | undefined>(
    violation ? new Date(violation.created_at) : new Date()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (!violation || !violationDate) return;
    
    setIsSubmitting(true);
    try {
      await onUpdateViolation(violation.id, amountCents, violationDate);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating violation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!violation) return;
    
    setIsSubmitting(true);
    try {
      await onDeleteViolation(violation.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting violation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verstoß bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Strafe (in Cent)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              value={amountCents}
              onChange={(e) => setAmountCents(parseInt(e.target.value) || 0)}
            />
            <div className="text-xs text-muted-foreground">
              €{(amountCents / 100).toFixed(2)}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {violationDate ? format(violationDate, 'PPP', { locale: de }) : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={violationDate}
                  onSelect={setViolationDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-between gap-2">
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}