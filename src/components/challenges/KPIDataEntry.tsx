import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const kpiEntrySchema = z.object({
  measured_value: z.number().min(0, "Wert muss positiv sein"),
  measurement_date: z.string().min(1, "Datum ist erforderlich"),
  notes: z.string().optional(),
});

type KPIEntryFormData = z.infer<typeof kpiEntrySchema>;

interface KPIDefinition {
  id: string;
  kpi_type: string;
  target_value: number;
  unit: string;
  measurement_frequency: string;
  aggregation_method: string;
  goal_direction: string;
}

interface ChallengeWithKPI {
  id: string;
  title: string;
  kpi_definitions: KPIDefinition[];
}

interface KPIDataEntryProps {
  challenge: ChallengeWithKPI;
  onSuccess: () => void;
}

export function KPIDataEntry({ challenge, onSuccess }: KPIDataEntryProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const kpiDef = challenge.kpi_definitions[0]; // Assuming one KPI per challenge for now

  // Calculate default date based on measurement frequency
  const getDefaultDate = () => {
    const today = new Date();
    switch (kpiDef.measurement_frequency) {
      case "weekly":
        // For weekly, default to end of current week (Sunday)
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
        return endOfWeek.toISOString().split('T')[0];
      case "monthly":
        // For monthly, default to end of current month
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return endOfMonth.toISOString().split('T')[0];
      default:
        // Daily - today
        return today.toISOString().split('T')[0];
    }
  };

  const form = useForm<KPIEntryFormData>({
    resolver: zodResolver(kpiEntrySchema),
    defaultValues: {
      measured_value: 0,
      measurement_date: getDefaultDate(),
      notes: "",
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

  const getFrequencyLabel = () => {
    switch (kpiDef.measurement_frequency) {
      case "weekly": return "wöchentlich";
      case "monthly": return "monatlich";
      default: return "täglich";
    }
  };

  const getDateLabel = () => {
    switch (kpiDef.measurement_frequency) {
      case "weekly": return "Woche (Ende der Woche)";
      case "monthly": return "Monat (Ende des Monats)";
      default: return "Datum";
    }
  };

  const getDateHelperText = () => {
    switch (kpiDef.measurement_frequency) {
      case "weekly": return "Trage den Gesamtwert für die ganze Woche ein";
      case "monthly": return "Trage den Gesamtwert für den ganzen Monat ein";
      default: return "Trage den Wert für diesen Tag ein";
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

  const onSubmit = async (data: KPIEntryFormData) => {
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Nicht angemeldet");

      const { error } = await supabase
        .from("kpi_measurements")
        .upsert({
          kpi_definition_id: kpiDef.id,
          user_id: user.user.id,
          measured_value: data.measured_value,
          measurement_date: data.measurement_date,
          notes: data.notes,
        });

      if (error) throw error;

      // Check if goal was achieved
      const goalAchieved = kpiDef.goal_direction === "higher_better" 
        ? data.measured_value >= kpiDef.target_value
        : data.measured_value <= kpiDef.target_value;

      toast({
        title: goalAchieved ? "Ziel erreicht! ✅" : "Ziel verfehlt ❌",
        description: goalAchieved 
          ? `${data.measured_value} ${kpiDef.unit} wurde erfolgreich eingetragen.`
          : `${data.measured_value} ${kpiDef.unit} eingetragen - Strafe wird automatisch berechnet.`,
        variant: goalAchieved ? "default" : "destructive",
      });

      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error("Error saving measurement:", error);
      toast({
        title: "Fehler",
        description: error.message || "Messwert konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const measuredValue = form.watch("measured_value");
  
  // Calculate target percentage - always show progress towards target
  const targetPercentage = measuredValue 
    ? Math.round((measuredValue / kpiDef.target_value) * 100)
    : 0;
  
  // Goal achievement logic
  const goalAchieved = measuredValue > 0
    ? (kpiDef.goal_direction === "higher_better" 
        ? measuredValue >= kpiDef.target_value 
        : measuredValue <= kpiDef.target_value)
    : false;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getKPIIcon(kpiDef.kpi_type)}</span>
          <div>
            <CardTitle className="text-lg">{getKPILabel(kpiDef.kpi_type)} eingeben</CardTitle>
            <CardDescription>{challenge.title} · {getFrequencyLabel()}</CardDescription>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>Ziel: {kpiDef.goal_direction === "higher_better" ? "≥" : "≤"} {kpiDef.target_value} {kpiDef.unit}</span>
            </div>
            <Badge variant={goalAchieved ? "default" : "secondary"}>
              {goalAchieved ? "Ziel erreicht ✅" : `${targetPercentage}% vom Ziel`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{getDateHelperText()}</p>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="measured_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Gemessener Wert ({kpiDef.unit})
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={kpiDef.kpi_type === "sleep_hours" ? "0.1" : "1"}
                      placeholder={`z.B. ${kpiDef.target_value}`}
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
                    {getDateLabel()}
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

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Speichere..." : "Messwert eintragen"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}