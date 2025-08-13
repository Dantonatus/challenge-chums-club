import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const kpiChallengeEditSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  description: z.string().optional(),
  start_date: z.string().min(1, "Startdatum ist erforderlich"),
  end_date: z.string().min(1, "Enddatum ist erforderlich"),
  kpi_type: z.string().min(1, "KPI-Typ ist erforderlich"),
  target_value: z.number().min(0.01, "Zielwert muss größer als 0 sein"),
  unit: z.string().min(1, "Einheit ist erforderlich"),
  measurement_frequency: z.enum(["daily", "weekly", "monthly"]),
  aggregation_method: z.enum(["average", "sum", "max", "min"]),
  penalty_amount: z.number().min(0.01, "Strafe muss größer als 0 sein"),
  goal_direction: z.enum(["higher_better", "lower_better"]),
});

type KPIChallengeEditFormData = z.infer<typeof kpiChallengeEditSchema>;

interface Challenge {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  penalty_amount: number;
  kpi_definitions: KPIDefinition[];
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

interface KPIChallengeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge;
  onSuccess: () => void;
}

const KPI_TEMPLATES = [
  { type: "steps", label: "Schritte", unit: "Schritte", icon: "🚶", aggregation: "sum" as const, goalDirection: "higher_better" as const },
  { type: "sleep_hours", label: "Schlafstunden", unit: "Stunden", icon: "😴", aggregation: "average" as const, goalDirection: "higher_better" as const },
  { type: "hrv", label: "Herzratenvariabilität", unit: "ms", icon: "❤️", aggregation: "average" as const, goalDirection: "higher_better" as const },
  { type: "resting_hr", label: "Ruhepuls", unit: "bpm", icon: "💓", aggregation: "average" as const, goalDirection: "lower_better" as const },
  { type: "custom", label: "Benutzerdefiniert", unit: "", icon: "📊", aggregation: "average" as const, goalDirection: "higher_better" as const },
];

export function KPIChallengeEditDialog({ open, onOpenChange, challenge, onSuccess }: KPIChallengeEditDialogProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const kpiDef = challenge.kpi_definitions[0]; // Assuming one KPI per challenge

  const form = useForm<KPIChallengeEditFormData>({
    resolver: zodResolver(kpiChallengeEditSchema),
    defaultValues: {
      title: challenge.title,
      description: challenge.description || "",
      start_date: challenge.start_date,
      end_date: challenge.end_date,
      kpi_type: kpiDef?.kpi_type || "",
      target_value: kpiDef?.target_value || 0,
      unit: kpiDef?.unit || "",
      measurement_frequency: (kpiDef?.measurement_frequency as any) || "daily",
      aggregation_method: (kpiDef?.aggregation_method as any) || "average",
      penalty_amount: challenge.penalty_amount,
      goal_direction: (kpiDef?.goal_direction as any) || "higher_better",
    },
  });

  useEffect(() => {
    if (kpiDef) {
      setSelectedTemplate(kpiDef.kpi_type);
    }
  }, [kpiDef]);

  const handleTemplateSelect = (templateType: string) => {
    const template = KPI_TEMPLATES.find(t => t.type === templateType);
    if (template) {
      setSelectedTemplate(templateType);
      form.setValue("kpi_type", template.type);
      form.setValue("unit", template.unit);
      form.setValue("aggregation_method", template.aggregation);
      form.setValue("goal_direction", template.goalDirection);
    }
  };

  const onSubmit = async (data: KPIChallengeEditFormData) => {
    setIsSubmitting(true);
    try {
      // Update the challenge
      const { error: challengeError } = await supabase
        .from("challenges")
        .update({
          title: data.title,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          penalty_amount: data.penalty_amount,
          penalty_cents: Math.round(data.penalty_amount * 100),
        })
        .eq("id", challenge.id);

      if (challengeError) throw challengeError;

      // Update the KPI definition
      const { error: kpiError } = await supabase
        .from("kpi_definitions")
        .update({
          kpi_type: data.kpi_type,
          target_value: data.target_value,
          unit: data.unit,
          measurement_frequency: data.measurement_frequency,
          aggregation_method: data.aggregation_method,
          goal_direction: data.goal_direction,
        })
        .eq("id", kpiDef.id);

      if (kpiError) throw kpiError;

      toast({
        title: "KPI Challenge aktualisiert",
        description: "Deine KPI Challenge wurde erfolgreich bearbeitet.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating KPI challenge:", error);
      toast({
        title: "Fehler",
        description: "KPI Challenge konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            KPI Challenge bearbeiten
          </DialogTitle>
          <DialogDescription>
            Bearbeite die Einstellungen deiner KPI Challenge
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* KPI Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>KPI-Typ auswählen</CardTitle>
              <CardDescription>
                Wähle einen vordefinierten KPI-Typ oder erstelle einen benutzerdefinierten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {KPI_TEMPLATES.map((template) => (
                  <Button
                    key={template.type}
                    variant={selectedTemplate === template.type ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => handleTemplateSelect(template.type)}
                    type="button"
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <span className="text-sm font-medium">{template.label}</span>
                    {template.unit && (
                      <Badge variant="secondary" className="text-xs">
                        {template.unit}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Challenge Configuration Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titel</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. 35.000 Schritte Challenge" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zielwert</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="z.B. 10000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="penalty_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strafe (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="z.B. 1.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Zusätzliche Informationen zur Challenge..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Startdatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enddatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="measurement_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Messfrequenz</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Täglich</SelectItem>
                          <SelectItem value="weekly">Wöchentlich</SelectItem>
                          <SelectItem value="monthly">Monatlich</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="goal_direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zielrichtung</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wählen..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="higher_better">↑ Höher ist besser</SelectItem>
                          <SelectItem value="lower_better">↓ Niedriger ist besser</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedTemplate === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Einheit</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. kg, km, Punkte..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aggregation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Berechnungsmethode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wählen..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="average">Durchschnitt</SelectItem>
                            <SelectItem value="sum">Summe</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Speichere..." : "Challenge aktualisieren"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}