import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, TrendingUp, TrendingDown, Users, Shield, DollarSign } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { formatEUR } from "@/lib/currency";

interface ProfileMetricCardsProps {
  analyticsData: any;
  loading: boolean;
  t: any;
}

export function ProfileMetricCards({ 
  analyticsData, 
  loading, 
  t 
}: ProfileMetricCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t.noData}
      </div>
    );
  }

  const cards = [
    {
      icon: Users,
      title: t.engagement,
      value: `${analyticsData.engagementRate.toFixed(1)}%`,
      delta: analyticsData.engagementDelta,
      sparklineData: analyticsData.weeklyData.map((w: any, i: number) => ({
        value: (w.engagedParticipants / (analyticsData.weeklyData.length > 0 ? 1 : 1)) * 100,
        index: i
      })),
      gradient: "from-green-500/10 to-green-600/5",
      iconColor: "text-green-600",
      strokeColor: "#10b981",
      tooltip: "Percentage of participants active each week. Calculated as engaged participants ÷ total participants. Higher is better."
    },
    {
      icon: Shield,
      title: t.discipline,
      value: analyticsData.disciplineScore.toFixed(1),
      delta: 0, // TODO: Calculate delta
      sparklineData: analyticsData.weeklyData.map((w: any, i: number) => ({
        value: w.fails,
        index: i
      })),
      gradient: "from-blue-500/10 to-blue-600/5", 
      iconColor: "text-blue-600",
      strokeColor: "#3b82f6",
      tooltip: "Normalized measure of average fails per participant per week. Higher values indicate better discipline."
    },
    {
      icon: DollarSign,
      title: t.financialImpact,
      value: formatEUR(Math.round(analyticsData.avgPenaltyPerParticipantWeek * 100)),
      delta: 0, // TODO: Calculate delta
      sparklineData: analyticsData.weeklyData.map((w: any, i: number) => ({
        value: w.penalties,
        index: i
      })),
      gradient: "from-red-500/10 to-red-600/5",
      iconColor: "text-red-600", 
      strokeColor: "#ef4444",
      tooltip: "Average penalty per participant per week. Lower values are better as they indicate fewer violations."
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <Card 
          key={index}
          className={`bg-gradient-to-br ${card.gradient} border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer group`}
          onClick={() => {
            // Scroll to relevant sections
            const sectionIds = ['participants-section', 'fails-section', 'penalties-section'];
            const targetId = sectionIds[index];
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {card.title}
              </CardTitle>
              <div className="flex items-center gap-1">
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="center"
                    className="max-w-xs px-3 py-2 text-sm shadow-lg border rounded-md bg-background"
                  >
                    {card.tooltip}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {card.value}
                </div>
                {card.delta !== 0 && (
                  <Badge 
                    variant={card.delta > 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {card.delta > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(card.delta).toFixed(1)}%
                  </Badge>
                )}
              </div>
              
              {/* Mini Sparkline */}
              <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={card.sparklineData}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={card.strokeColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ 
                        r: 4, 
                        className: "group-hover:r-6 transition-all duration-300" 
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}