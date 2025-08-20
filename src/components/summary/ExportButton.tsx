import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  data: any;
  filters: {
    participants: string[];
    challengeTypes: string[];
    groups: string[];
  };
  dateRange: { start: string; end: string };
  lang: 'de' | 'en';
}

export const ExportButton = ({ data, filters, dateRange, lang }: ExportButtonProps) => {
  const t = {
    de: {
      export: "Exportieren",
      filename: "challenge-overview"
    },
    en: {
      export: "Export",
      filename: "challenge-overview"
    }
  };

  const handleExport = () => {
    if (!data?.challenges) return;

    const rows: string[][] = [];
    
    // Headers
    const headers = [
      'Challenge ID',
      'Challenge Title',
      'Challenge Type',
      'Start Date',
      'End Date',
      'Participant',
      'Participant ID',
      'Violation Date',
      'Violation Amount (€)',
      'KPI Date',
      'KPI Value',
      'KPI Target'
    ];
    rows.push(headers);

    // Data rows
    data.challenges.forEach((challenge: any) => {
      // Create rows for violations
      if (challenge.violations && challenge.violations.length > 0) {
        challenge.violations.forEach((violation: any) => {
          const participant = challenge.participants.find((p: any) => p.user_id === violation.user_id);
          rows.push([
            challenge.id,
            challenge.title,
            challenge.challenge_type,
            challenge.start_date,
            challenge.end_date,
            participant?.display_name || 'Unknown',
            violation.user_id,
            violation.date || '',
            (violation.amount_cents / 100).toFixed(2),
            '',
            '',
            ''
          ]);
        });
      }

      // Create rows for KPI measurements
      if (challenge.kpi_measurements && challenge.kpi_measurements.length > 0) {
        challenge.kpi_measurements.forEach((measurement: any) => {
          const participant = challenge.participants.find((p: any) => p.user_id === measurement.user_id);
          rows.push([
            challenge.id,
            challenge.title,
            challenge.challenge_type,
            challenge.start_date,
            challenge.end_date,
            participant?.display_name || 'Unknown',
            measurement.user_id,
            '',
            '',
            measurement.date || '',
            measurement.measured_value?.toString() || '',
            measurement.target_value?.toString() || ''
          ]);
        });
      }

      // If no violations or measurements, create a basic row
      if ((!challenge.violations || challenge.violations.length === 0) && 
          (!challenge.kpi_measurements || challenge.kpi_measurements.length === 0)) {
        challenge.participants.forEach((participant: any) => {
          rows.push([
            challenge.id,
            challenge.title,
            challenge.challenge_type,
            challenge.start_date,
            challenge.end_date,
            participant.display_name,
            participant.user_id,
            '',
            '',
            '',
            '',
            ''
          ]);
        });
      }
    });

    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => `"${cell?.toString().replace(/"/g, '""') || ''}"`).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${t[lang].filename}-${dateRange.start}-${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      {t[lang].export}
    </Button>
  );
};