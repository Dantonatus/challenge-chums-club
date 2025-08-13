import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, CheckSquare } from "lucide-react";

interface ChallengeTypeToggleProps {
  value: "habit" | "kpi";
  onValueChange: (value: "habit" | "kpi") => void;
}

export function ChallengeTypeToggle({ value, onValueChange }: ChallengeTypeToggleProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-muted">
        <TabsTrigger 
          value="habit" 
          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          <CheckSquare className="h-4 w-4" />
          Habit Challenges
        </TabsTrigger>
        <TabsTrigger 
          value="kpi" 
          className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
        >
          <Target className="h-4 w-4" />
          KPI Challenges
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}