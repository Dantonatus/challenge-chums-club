import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEUR } from "@/lib/currency";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Euro } from "lucide-react";

interface ProfileDashboardHeaderProps {
  analyticsData: any;
  loading: boolean;
  t: any;
}

export function ProfileDashboardHeader({ 
  analyticsData, 
  loading, 
  t 
}: ProfileDashboardHeaderProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-gradient-to-br from-card to-muted/20 border-0 shadow-lg">
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
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
      icon: Activity,
      title: t.activeChallenges,
      value: analyticsData.activeChallenges,
      trend: 0, // TODO: Calculate trend
      gradientFrom: "from-blue-500/10",
      gradientTo: "to-blue-600/5",
      iconColor: "text-blue-600"
    },
    {
      icon: AlertTriangle,
      title: t.totalViolations || "Total Violations",
      value: analyticsData.totalViolations,
      trend: 0, // TODO: Calculate trend  
      gradientFrom: "from-orange-500/10",
      gradientTo: "to-orange-600/5",
      iconColor: "text-orange-600"
    },
    {
      icon: Euro,
      title: t.totalPenalties || "Total Penalties",
      value: formatEUR(Math.round(analyticsData.totalPenalties * 100)),
      trend: 0, // TODO: Calculate trend
      gradientFrom: "from-red-500/10", 
      gradientTo: "to-red-600/5",
      iconColor: "text-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <Card 
          key={index}
          className={`bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">
                    {card.value}
                  </p>
                  {card.trend !== 0 && (
                    <Badge 
                      variant={card.trend > 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {card.trend > 0 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(card.trend)}%
                    </Badge>
                  )}
                </div>
              </div>
              <card.icon className={`w-8 h-8 ${card.iconColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}