import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const kpiChallengeSchema = z.object({
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

type KPIChallengeFormData = z.infer<typeof kpiChallengeSchema>;

interface KPIChallengeFormProps {
  groupId: string;
  onSuccess: () => void;
}

const KPI_TEMPLATES = [
  { type: "steps", label: "Schritte", unit: "Schritte", icon: "🚶", aggregation: "sum" as const, goalDirection: "higher_better" as const },
  { type: "sleep_hours", label: "Schlafstunden", unit: "Stunden", icon: "😴", aggregation: "average" as const, goalDirection: "higher_better" as const },
  { type: "hrv", label: "Herzratenvariabilität", unit: "ms", icon: "❤️", aggregation: "average" as const, goalDirection: "higher_better" as const },
  { type: "resting_hr", label: "Ruhepuls", unit: "bpm", icon: "💓", aggregation: "average" as const, goalDirection: "lower_better" as const },
  { type: "custom", label: "Benutzerdefiniert", unit: "", icon: "📊", aggregation: "average" as const, goalDirection: "higher_better" as const },
];

export function KPIChallengeForm({ groupId, onSuccess }: KPIChallengeFormProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<KPIChallengeFormData>({
    resolver: zodResolver(kpiChallengeSchema),
    defaultValues: {
      title: "",
      description: "",
      start_date: new Date().toISOString().split('T')[0],
      end_date: "",
      kpi_type: "",
      target_value: 0,
      unit: "",
      measurement_frequency: "daily",
      aggregation_method: "average",
      penalty_amount: 1.0,
      goal_direction: "higher_better",
    },
  });

  const handleTemplateSelect = (templateType: string) => {
    const template = KPI_TEMPLATES.find(t => t.type === templateType);
    if (template) {
      setSelectedTemplate(templateType);
      form.setValue("kpi_type", template.type);
      form.setValue("unit", template.unit);
      form.setValue("aggregation_method", template.aggregation);
      form.setValue("goal_direction", template.goalDirection);
      
      // Set suggested titles and targets
      switch (template.type) {
        case "steps":
          form.setValue("title", "Schritte Challenge");
          form.setValue("target_value", 10000);
          form.setValue("measurement_frequency", "daily");
          break;
        case "sleep_hours":
          form.setValue("title", "Schlaf Challenge");
          form.setValue("target_value", 7.5);
          form.setValue("measurement_frequency", "daily");
          break;
        case "hrv":
          form.setValue("title", "HRV Challenge");
          form.setValue("target_value", 60);
          form.setValue("measurement_frequency", "daily");
          break;
        case "resting_hr":
          form.setValue("title", "Ruhepuls Challenge");
          form.setValue("target_value", 60);
          form.setValue("measurement_frequency", "daily");
          break;
      }
    }
  };

  const onSubmit = async (data: KPIChallengeFormData) => {
    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Nicht angemeldet");

      // Create the challenge
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          title: data.title,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          group_id: groupId,
          created_by: user.user.id,
          challenge_type: "kpi",
          penalty_amount: data.penalty_amount,
          penalty_cents: Math.round(data.penalty_amount * 100),
          strike_allowance: 0,
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Create the KPI definition
      const { error: kpiError } = await supabase
        .from("kpi_definitions")
        .insert({
          challenge_id: challenge.id,
          kpi_type: data.kpi_type,
          target_value: data.target_value,
          unit: data.unit,
          measurement_frequency: data.measurement_frequency,
          aggregation_method: data.aggregation_method,
          goal_direction: data.goal_direction,
        });

      if (kpiError) throw kpiError;

      // Add creator as participant
      const { error: participantError } = await supabase
        .from("challenge_participants")
        .insert({
          challenge_id: challenge.id,
          user_id: user.user.id,
        });

      if (participantError) throw participantError;

      toast({
        title: "KPI Challenge erstellt",
        description: "Deine KPI Challenge wurde erfolgreich erstellt.",
      });

      onSuccess();
      form.reset();
      setSelectedTemplate("");
    } catch (error) {
      console.error("Error creating KPI challenge:", error);
      toast({
        title: "Fehler",
        description: "KPI Challenge konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Erstelle..." : "KPI Challenge erstellen"}
          </Button>
        </form>
      </Form>
    </div>
  );
}