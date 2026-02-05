 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Link } from "react-router-dom";
 import { CheckCircle2, Circle, AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { motion, AnimatePresence } from "framer-motion";
 
 interface TodayHabit {
   challengeId: string;
   title: string;
   todayStatus: 'done' | 'pending' | 'missed';
   streakAtRisk: boolean;
   currentStreak: number;
 }
 
 interface TodayWidgetProps {
   habits: TodayHabit[];
   lang: "de" | "en";
 }
 
 const t = {
   de: {
     title: "Heute",
     allDone: "Alles erledigt! 🎉",
     pending: "offen",
     done: "erledigt",
     atRisk: "Streak in Gefahr",
     goToEntry: "Jetzt eintragen",
     progress: "von",
     habits: "Habits",
   },
   en: {
     title: "Today",
     allDone: "All done! 🎉",
     pending: "pending",
     done: "done",
     atRisk: "Streak at risk",
     goToEntry: "Log now",
     progress: "of",
     habits: "habits",
   },
 };
 
 export function TodayWidget({ habits, lang }: TodayWidgetProps) {
   const labels = t[lang];
   
   const doneCount = habits.filter(h => h.todayStatus === 'done').length;
   const totalCount = habits.length;
   const allDone = doneCount === totalCount && totalCount > 0;
   const progressPercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
 
   // Sort: at-risk first, then pending, then done
   const sortedHabits = [...habits].sort((a, b) => {
     if (a.streakAtRisk && !b.streakAtRisk) return -1;
     if (!a.streakAtRisk && b.streakAtRisk) return 1;
     if (a.todayStatus === 'pending' && b.todayStatus === 'done') return -1;
     if (a.todayStatus === 'done' && b.todayStatus === 'pending') return 1;
     return 0;
   });
 
   if (habits.length === 0) return null;
 
   return (
     <Card className={cn(
       "overflow-hidden transition-all duration-500",
       allDone && "bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30"
     )}>
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between">
           <CardTitle className="text-base flex items-center gap-2">
             📋 {labels.title}
           </CardTitle>
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium">
               {doneCount} {labels.progress} {totalCount}
             </span>
             {/* Mini progress ring */}
             <div className="relative w-8 h-8">
               <svg className="w-8 h-8 transform -rotate-90">
                 <circle
                   cx="16"
                   cy="16"
                   r="12"
                   stroke="currentColor"
                   strokeWidth="3"
                   fill="none"
                   className="text-muted/30"
                 />
                 <circle
                   cx="16"
                   cy="16"
                   r="12"
                   stroke="currentColor"
                   strokeWidth="3"
                   fill="none"
                   strokeDasharray={`${progressPercent * 0.754} 100`}
                   className={cn(
                     "transition-all duration-500",
                     allDone ? "text-green-500" : "text-primary"
                   )}
                 />
               </svg>
               {allDone && (
                 <motion.div
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   className="absolute inset-0 flex items-center justify-center"
                 >
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                 </motion.div>
               )}
             </div>
           </div>
         </div>
       </CardHeader>
       
       <CardContent className="space-y-3">
         <AnimatePresence mode="popLayout">
           {allDone ? (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-center py-4"
             >
               <motion.div
                 initial={{ scale: 0.8 }}
                 animate={{ scale: [1, 1.1, 1] }}
                 transition={{ duration: 0.5, times: [0, 0.5, 1] }}
                 className="text-4xl mb-2"
               >
                 ✨
               </motion.div>
               <p className="text-green-600 dark:text-green-400 font-medium">
                 {labels.allDone}
               </p>
             </motion.div>
           ) : (
             <div className="space-y-2">
               {sortedHabits.slice(0, 5).map((habit, index) => (
                 <motion.div
                   key={habit.challengeId}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: index * 0.05 }}
                   className={cn(
                     "flex items-center justify-between p-2 rounded-lg transition-colors",
                     habit.streakAtRisk && "bg-amber-500/10 border border-amber-500/20",
                     habit.todayStatus === 'done' && "bg-muted/30 opacity-60"
                   )}
                 >
                   <div className="flex items-center gap-2 flex-1 min-w-0">
                     {habit.todayStatus === 'done' ? (
                       <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                     ) : habit.streakAtRisk ? (
                       <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                     ) : (
                       <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                     )}
                     <span className={cn(
                       "text-sm truncate",
                       habit.todayStatus === 'done' && "line-through text-muted-foreground"
                     )}>
                       {habit.title}
                     </span>
                   </div>
                   
                   <div className="flex items-center gap-2 shrink-0">
                     {habit.streakAtRisk && habit.currentStreak > 0 && (
                       <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                         🔥 {habit.currentStreak}
                       </Badge>
                     )}
                     {habit.todayStatus === 'done' ? (
                       <Badge variant="secondary" className="text-xs">
                         ✓
                       </Badge>
                     ) : (
                       <Badge variant="outline" className="text-xs">
                         {labels.pending}
                       </Badge>
                     )}
                   </div>
                 </motion.div>
               ))}
               
               {habits.length > 5 && (
                 <p className="text-xs text-muted-foreground text-center pt-1">
                   +{habits.length - 5} {lang === 'de' ? 'weitere' : 'more'}
                 </p>
               )}
             </div>
           )}
         </AnimatePresence>
 
         {!allDone && (
           <Button asChild className="w-full" size="sm">
             <Link to="/app/entry">
               {labels.goToEntry}
               <ArrowRight className="ml-2 h-4 w-4" />
             </Link>
           </Button>
         )}
       </CardContent>
     </Card>
   );
 }