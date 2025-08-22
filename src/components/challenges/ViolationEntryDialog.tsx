import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, getWeek } from "date-fns";
import { de } from "date-fns/locale";

interface ViolationEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddViolation: (count: number, date?: Date) => Promise<void>;
  selectedRow: any;
}

export function ViolationEntryDialog({ 
  open, 
  onOpenChange, 
  onAddViolation, 
  selectedRow 
}: ViolationEntryDialogProps) {
  const [violationCount, setViolationCount] = useState(1);
  const [violationDate, setViolationDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRow || violationCount < 1) return;
    
    setIsSubmitting(true);
    try {
      // Add all violations at once with the correct count
      await onAddViolation(violationCount, violationDate);
      
      // Reset form
      setViolationCount(1);
      setViolationDate(new Date());
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding violations:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verstoß hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="count">Anzahl Verstöße</Label>
            <Input
              id="count"
              type="number"
              min="1"
              value={violationCount}
              onChange={(e) => setViolationCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label>Datum (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {violationDate ? (
                    <div className="flex flex-col items-start">
                      <span>{format(violationDate, 'PPP', { locale: de })}</span>
                      <span className="text-xs text-muted-foreground">KW {getWeek(violationDate, { weekStartsOn: 1, firstWeekContainsDate: 4, locale: de })}</span>
                    </div>
                  ) : (
                    'Datum wählen'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={violationDate}
                  onSelect={setViolationDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedRow}
            >
              {isSubmitting ? "Hinzufügen..." : `${violationCount} Verstoß${violationCount > 1 ? 'e' : ''} hinzufügen`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}