import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const t = {
  en: {
    title: "Title",
    description: "Description",
    startDate: "Start Date",
    endDate: "End Date",
    penalty: "Penalty per violation (€)",
    save: "Save Challenge",
    cancel: "Cancel",
    help: "End date must be after start date; penalty must be > 0.",
    updated: "Challenge saved",
    created: "Challenge created",
  },
  de: {
    title: "Titel",
    description: "Beschreibung",
    startDate: "Startdatum",
    endDate: "Enddatum",
    penalty: "Strafe pro Verstoß (€)",
    save: "Challenge speichern",
    cancel: "Abbrechen",
    help: "Enddatum muss nach Startdatum liegen; Strafe > 0.",
    updated: "Challenge gespeichert",
    created: "Challenge erstellt",
  },
};

const schema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    start_date: z.date(),
    end_date: z.date(),
    penalty_amount: z.number().positive(),
  })
  .refine((v) => v.end_date > v.start_date, {
    path: ["end_date"],
    message: "End date must be after start date",
  });

export type ChallengeFormValues = z.infer<typeof schema>;

interface ChallengeFormProps {
  groupId: string;
  challengeId?: string;
  initialValues?: Partial<ChallengeFormValues & { created_by?: string }>;
  onCancel?: () => void;
  onSaved?: (challengeId: string) => void;
  locale?: keyof typeof t;
}

export default function ChallengeForm({ groupId, challengeId, initialValues, onCancel, onSaved, locale = "de" }: ChallengeFormProps) {
  const { toast } = useToast();
  const dict = t[locale];

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      start_date: initialValues?.start_date ? new Date(initialValues.start_date as unknown as string) : new Date(),
      end_date: initialValues?.end_date ? new Date(initialValues.end_date as unknown as string) : new Date(new Date().getTime() + 7 * 86400000),
      penalty_amount: typeof initialValues?.penalty_amount === "number" ? initialValues.penalty_amount : 1,
    },
  });

  useEffect(() => {
    if (!initialValues) return;
    form.reset({
      title: initialValues.title ?? "",
      description: initialValues.description ?? "",
      start_date: initialValues.start_date ? new Date(initialValues.start_date as unknown as string) : new Date(),
      end_date: initialValues.end_date ? new Date(initialValues.end_date as unknown as string) : new Date(new Date().getTime() + 7 * 86400000),
      penalty_amount: typeof initialValues.penalty_amount === "number" ? initialValues.penalty_amount : 1,
    });
  }, [initialValues]);

  const onSubmit = async (values: ChallengeFormValues) => {
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const userId = authData?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const payload = {
        group_id: groupId,
        title: values.title,
        description: values.description || null,
        start_date: values.start_date.toISOString().slice(0, 10),
        end_date: values.end_date.toISOString().slice(0, 10),
        penalty_amount: values.penalty_amount,
        // keep legacy path working
        penalty_cents: Math.round(values.penalty_amount * 100),
        created_by: userId,
      } as any;

      if (challengeId) {
        const { error } = await (supabase as any).from("challenges").update(payload).eq("id", challengeId);
        if (error) throw error;
        toast({ title: dict.updated });
        onSaved?.(challengeId);
      } else {
        const { data, error } = await (supabase as any).from("challenges").insert(payload).select("id").maybeSingle();
        if (error) throw error;
        toast({ title: dict.created });
        if (data?.id) onSaved?.(data.id);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" as any });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.title}</FormLabel>
              <FormControl>
                <Input placeholder="Morning Run" {...field} />
              </FormControl>
              <FormDescription>{dict.help}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.description}</FormLabel>
              <FormControl>
                <Textarea placeholder="Short description (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{dict.startDate}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{dict.endDate}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="penalty_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.penalty}</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <Input type="number" step="0.01" min={0.01} className="pl-7" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value || "0"))} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>{dict.cancel}</Button>
          )}
          <Button type="submit">{dict.save}</Button>
        </div>
      </form>
    </Form>
  );
}
