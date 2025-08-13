import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Target, TrendingUp, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const kpiEditSchema = z.object({
  measured_value: z.number().min(0, "Wert muss positiv sein"),
  measurement_date: z.string().min(1, "Datum ist erforderlich"),
  notes: z.string().optional(),
});

type KPIEditFormData = z.infer<typeof kpiEditSchema>;

interface KPIMeasurement {
  id: string;
  measured_value: number;
  measurement_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface KPIDefinition {
  id: string;
  kpi_type: string;
  target_value: number;
  unit: string;
  measurement_frequency: string;
  aggregation_method: string;
  goal_direction: string;
}

interface KPIEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurement: KPIMeasurement;
  kpiDefinition: KPIDefinition;
  onSuccess: () => void;
}

export function KPIEditDialog({ open, onOpenChange, measurement, kpiDefinition, onSuccess }: KPIEditDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<KPIEditFormData>({
    resolver: zodResolver(kpiEditSchema),
    defaultValues: {
      measured_value: measurement.measured_value,
      measurement_date: measurement.measurement_date,
      notes: measurement.notes || "",
    },
  });

  const getKPIIcon = (kpiType: string) => {
    switch (kpiType) {
      case "steps": return "🚶";
      case "sleep_hours": return "😴";
      case "hrv": return "❤️";
      case "resting_hr": return "💓";
      default: return "📊";
    }
  };

  const getKPILabel = (kpiType: string) => {
    switch (kpiType) {
      case "steps": return "Schritte";
      case "sleep_hours": return "Schlafstunden";
      case "hrv": return "HRV";
      case "resting_hr": return "Ruhepuls";
      default: return "Messwert";
    }
  };

  const onSubmit = async (data: KPIEditFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("kpi_measurements")
        .update({
          measured_value: data.measured_value,
          measurement_date: data.measurement_date,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", measurement.id);

      if (error) throw error;

      // Check if goal was achieved
      const goalAchieved = kpiDefinition.goal_direction === "higher_better" 
        ? data.measured_value >= kpiDefinition.target_value
        : data.measured_value <= kpiDefinition.target_value;

      toast({
        title: "Messwert aktualisiert",
        description: goalAchieved 
          ? `${data.measured_value} ${kpiDefinition.unit} - Ziel erreicht! ✅`
          : `${data.measured_value} ${kpiDefinition.unit} - Ziel verfehlt ❌`,
        variant: goalAchieved ? "default" : "destructive",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating measurement:", error);
      toast({
        title: "Fehler",
        description: error.message || "Messwert konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const measuredValue = form.watch("measured_value");
  const goalAchieved = measuredValue 
    ? (kpiDefinition.goal_direction === "higher_better" ? measuredValue >= kpiDefinition.target_value : measuredValue <= kpiDefinition.target_value)
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {getKPILabel(kpiDefinition.kpi_type)} bearbeiten
          </DialogTitle>
          <DialogDescription>
            Messwert vom {format(new Date(measurement.measurement_date), 'PPP', { locale: de })} bearbeiten
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>Ziel: {kpiDefinition.goal_direction === "higher_better" ? "≥" : "≤"} {kpiDefinition.target_value} {kpiDefinition.unit}</span>
            </div>
            {measuredValue && (
              <div className="flex items-center gap-1">
                <span className={goalAchieved ? "text-green-600" : "text-red-600"}>
                  {goalAchieved ? "✅ Erreicht" : "❌ Verfehlt"}
                </span>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="measured_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Gemessener Wert ({kpiDefinition.unit})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step={kpiDefinition.kpi_type === "sleep_hours" ? "0.1" : "1"}
                        placeholder={`z.B. ${kpiDefinition.target_value}`}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="text-lg font-medium"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="measurement_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Datum
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notizen (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Zusätzliche Informationen..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Speichere..." : "Aktualisieren"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}