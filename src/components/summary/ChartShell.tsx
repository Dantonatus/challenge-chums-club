import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export const CHART_HEIGHT = 420; // Exact height for both charts
export const CHART_MARGIN = { top: 12, right: 16, bottom: 8, left: 40 }; // Identical margins

export interface ChartShellProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;   // Badges (Total Fails / €) + Reference Lines Toggle
  legend?: React.ReactNode;        // Participant chips / filters
  footer?: React.ReactNode;        // "Milestones"
  children: React.ReactNode;       // <LineChart .../> etc.
}

export default function ChartShell({
  title, 
  subtitle, 
  headerRight, 
  legend, 
  footer, 
  children,
}: ChartShellProps) {
  return (
    <Card className="w-full">
      <CardHeader className="p-6 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">{title}</div>
            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          </div>
          {headerRight}
        </div>
        {legend && <div className="mt-4">{legend}</div>}
      </CardHeader>

      {/* Chart area WITHOUT padding, so both render identically */}
      <CardContent className="p-0">
        <div className="w-full" style={{ height: CHART_HEIGHT }}>
          {children}
        </div>
      </CardContent>

      {footer && (
        <CardFooter className="px-6 pb-6 pt-3">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}