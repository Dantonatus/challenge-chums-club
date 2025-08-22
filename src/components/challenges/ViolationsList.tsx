import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ViolationEditDialog } from "./ViolationEditDialog";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ViolationsListProps {
  challengeId: string;
  participants: { user_id: string; name: string }[];
}

export function ViolationsList({ challengeId, participants }: ViolationsListProps) {
  const { start, end } = useDateRange();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);

  const { data: violations = [], isLoading, refetch } = useQuery({
    enabled: !!challengeId,
    queryKey: ["violations-list", challengeId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_violations")
        .select("id, user_id, amount_cents, created_at")
        .eq("challenge_id", challengeId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const participantMap = new Map(participants.map(p => [p.user_id, p.name]));

  const handleEditViolation = (violation: any) => {
    setSelectedViolation(violation);
    setEditDialogOpen(true);
  };

  const handleUpdateViolation = async (violationId: string, amountCents: number, date: Date) => {
    try {
      const { error } = await supabase
        .from("challenge_violations")
        .update({
          amount_cents: amountCents,
          created_at: date.toISOString()
        })
        .eq("id", violationId);

      if (error) throw error;

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["challenge_violations"] });
      queryClient.invalidateQueries({ queryKey: ["violations-per-participant"] });
      toast({ title: "Verstoß aktualisiert" });
    } catch (error: any) {
      toast({ 
        title: "Fehler", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteViolation = async (violationId: string) => {
    try {
      const { error } = await supabase
        .from("challenge_violations")
        .delete()
        .eq("id", violationId);

      if (error) throw error;

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["challenge_violations"] });
      queryClient.invalidateQueries({ queryKey: ["violations-per-participant"] });
      toast({ title: "Verstoß gelöscht" });
    } catch (error: any) {
      toast({ 
        title: "Fehler", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!violations.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Keine Verstöße im ausgewählten Zeitraum
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teilnehmer</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Strafe</TableHead>
              <TableHead className="w-24">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violations.map((violation) => (
              <TableRow key={violation.id}>
                <TableCell className="font-medium">
                  {participantMap.get(violation.user_id) || "Unbekannt"}
                </TableCell>
                <TableCell>
                  {format(new Date(violation.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                </TableCell>
                <TableCell>
                  €{(violation.amount_cents / 100).toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditViolation(violation)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ViolationEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdateViolation={handleUpdateViolation}
        onDeleteViolation={handleDeleteViolation}
        violation={selectedViolation}
      />
    </>
  );
}