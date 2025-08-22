import { Link } from "react-router-dom";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Calendar, Users, Euro, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradientButton } from "@/components/ui/GradientButton";
import { formatEUR } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description?: string;
  challenge_type: 'habit' | 'kpi';
  start_date: string;
  end_date: string;
  participantCount: number;
  totalViolationAmount: number;
}

interface ChallengeCardProps {
  challenge: Challenge;
  index: number;
  lang: 'de' | 'en';
}

export function ChallengeCard({ challenge, index, lang }: ChallengeCardProps) {
  const locale = lang === 'de' ? de : enUS;
  
  const t = {
    de: {
      participants: "Teilnehmer",
      penalties: "Strafen", 
      viewDetails: "Details ansehen",
      habit: "Habit",
      kpi: "KPI"
    },
    en: {
      participants: "Participants",
      penalties: "Penalties",
      viewDetails: "View Details", 
      habit: "Habit",
      kpi: "KPI"
    }
  };

  const formatDate = (dateStr: string) => 
    format(new Date(dateStr), 'dd.MM.yyyy', { locale });

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden rounded-xl border-0",
        "bg-gradient-to-br from-background/80 via-background to-background/60",
        "backdrop-blur-sm shadow-sm hover:shadow-xl",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-2 hover:border-primary/20",
        "focus-within:ring-2 focus-within:ring-primary/20",
        "animate-fade-in motion-reduce:hover:translate-y-0"
      )}
      style={{ 
        animationDelay: `${index * 100}ms`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)"
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
      
      <CardContent className="p-6 space-y-4 relative">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground mb-1 line-clamp-1">
              {challenge.title}
            </h3>
            <div className="min-h-[2.5rem] flex items-start">
              {challenge.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {challenge.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Type Badge */}
          <Badge
            variant="outline"
            className={cn(
              "px-3 py-1 text-xs font-medium border-0 shadow-sm",
              "animate-scale-in motion-reduce:animate-none",
              challenge.challenge_type === 'habit' 
                ? "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 dark:from-blue-950/30 dark:to-cyan-950/30 dark:text-blue-300"
                : "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 dark:from-emerald-950/30 dark:to-teal-950/30 dark:text-emerald-300"
            )}
            style={{ animationDelay: `${index * 100 + 200}ms` }}
          >
            {challenge.challenge_type === 'habit' ? t[lang].habit : t[lang].kpi}
          </Badge>
        </div>

        {/* Meta Information */}
        <div className="space-y-3">
          {/* Date Range */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary/60" />
            <span className="font-medium">
              {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
            </span>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Participants */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground font-medium">
                  {t[lang].participants}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">
                  {challenge.participantCount}
                </span>
              </div>
            </div>

            {/* Penalties */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Euro className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground font-medium">
                  {t[lang].penalties}
                </span>
              </div>
              <span className="font-semibold text-foreground">
                {formatEUR(challenge.totalViolationAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <GradientButton 
          asChild 
          size="lg"
          className="w-full mt-4 group/btn relative overflow-hidden"
        >
          <Link to={`/challenges/${challenge.id}`} className="flex items-center justify-center gap-2">
            <span className="font-semibold">{t[lang].viewDetails}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
            
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          </Link>
        </GradientButton>
      </CardContent>
    </Card>
  );
}