import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface KPIMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricType: 'performance' | 'engagement' | 'discipline' | 'financial' | null;
  values?: {
    performance?: number;
    engagement?: number;
    discipline?: number;
    financial?: number;
  };
}

export function KPIMetricModal({ isOpen, onClose, metricType, values }: KPIMetricModalProps) {
  if (!metricType) return null;

  const getMetricContent = () => {
    switch (metricType) {
      case 'performance':
        return {
          title: "Performance Index",
          definition: "A weighted score that combines Engagement (20%), Discipline (50%) and Financial Impact (30%). Each component is normalized (0–1), and the final index is shown on a 0–100 scale.",
          example: `Suppose Engagement = 95% (0.95), Discipline = 0.6 and Financial Impact = 0.7. Then:

Index = (0.2 × 0.95 + 0.5 × 0.6 + 0.3 × 0.7) × 100 = 77.7

Your current values:
• Engagement: ${values?.engagement?.toFixed(1)}% (${(values?.engagement ? values.engagement / 100 : 0).toFixed(2)})
• Discipline: ${values?.discipline?.toFixed(2)}
• Financial Impact: ${values?.financial?.toFixed(2)}
• Performance Index: ${values?.performance?.toFixed(1)}`
        };
      
      case 'engagement':
        return {
          title: "Engagement Rate",
          definition: "The percentage of participants who were active at least once per week during the selected period.",
          example: `If 20 participants are enrolled and 19 of them participated at least once in the period, Engagement = (19 ÷ 20) × 100% = 95%.

Your current engagement rate: ${values?.engagement?.toFixed(1)}%`
        };
      
      case 'discipline':
        return {
          title: "Discipline Score",
          definition: "A normalized score (0–1) representing how few fails (violations or KPI misses) occur per participant.",
          example: `Calculation:
avgFailsPerUserPerWeek = total fails ÷ (total participants × weeks)
Discipline = max(0, 1 - avgFailsPerUserPerWeek ÷ failThreshold)

Example: With 10 participants over 4 weeks and 12 total fails, avgFails = 12 ÷ (10 × 4) = 0.3. If the threshold is 1, Discipline = 1 – 0.3 = 0.7.

Your current discipline score: ${values?.discipline?.toFixed(2)}`
        };
      
      case 'financial':
        return {
          title: "Financial Impact",
          definition: "The average penalty per participant per week (in euros). Lower values indicate lower costs.",
          example: `If total penalties in the period are €22, there are 11 participants, and the period covers 2 weeks, then:

Financial Impact = 22 ÷ (11 × 2) = €1.00

Your current financial impact: €${values?.financial?.toFixed(2)}`
        };
      
      default:
        return { title: "", definition: "", example: "" };
    }
  };

  const content = getMetricContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {content.title}
            <Badge variant="outline" className="text-xs">
              KPI Metric
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Definition
            </h3>
            <p className="text-sm leading-relaxed">
              {content.definition}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
              Example & Current Values
            </h3>
            <pre className="text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap font-mono">
              {content.example}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}