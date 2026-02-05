 import { useState, useEffect } from "react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Link } from "react-router-dom";
 import { AlertTriangle, ArrowRight, X, Flame } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { motion, AnimatePresence } from "framer-motion";
 
 interface HabitAtRisk {
   challengeId: string;
   title: string;
   currentStreak: number;
 }
 
 interface NeverMissTwiceAlertProps {
   habitsAtRisk: HabitAtRisk[];
   lang: "de" | "en";
 }
 
 const t = {
   de: {
     title: "Rette deinen Streak!",
     subtitle: "Du hast gestern verpasst:",
     principle: '"Never miss twice" - ein Tag ist ok, aber nicht zwei hintereinander.',
     streakDanger: "Tage Streak in Gefahr",
     action: "Jetzt nachholen",
     dismiss: "Später",
     multiple: "Habits brauchen Aufmerksamkeit",
   },
   en: {
     title: "Save your streak!",
     subtitle: "You missed yesterday:",
     principle: '"Never miss twice" - one day is okay, but not two in a row.',
     streakDanger: "day streak at risk",
     action: "Catch up now",
     dismiss: "Later",
     multiple: "habits need attention",
   },
 };
 
 const DISMISS_KEY = 'never-miss-twice-dismissed';
 
 export function NeverMissTwiceAlert({ habitsAtRisk, lang }: NeverMissTwiceAlertProps) {
   const labels = t[lang];
   const [dismissed, setDismissed] = useState(false);
   const [isVisible, setIsVisible] = useState(true);
 
   // Check if already dismissed today
   useEffect(() => {
     const dismissedData = localStorage.getItem(DISMISS_KEY);
     if (dismissedData) {
       const { date } = JSON.parse(dismissedData);
       const today = new Date().toDateString();
       if (date === today) {
         setDismissed(true);
       } else {
         // Clear old dismissal
         localStorage.removeItem(DISMISS_KEY);
       }
     }
   }, []);
 
   // Don't show if:
   // - No habits at risk
   // - Already dismissed today
   // - It's after 22:00 (too late to nag)
   const currentHour = new Date().getHours();
   const tooLate = currentHour >= 22;
 
   if (habitsAtRisk.length === 0 || dismissed || tooLate || !isVisible) {
     return null;
   }
 
   const handleDismiss = () => {
     localStorage.setItem(DISMISS_KEY, JSON.stringify({ date: new Date().toDateString() }));
     setIsVisible(false);
   };
 
   // Get the habit with highest streak at risk
   const primaryHabit = habitsAtRisk.reduce((max, h) => 
     h.currentStreak > max.currentStreak ? h : max
   , habitsAtRisk[0]);
 
   const hasMultiple = habitsAtRisk.length > 1;
 
   return (
     <AnimatePresence>
       {isVisible && (
         <motion.div
           initial={{ opacity: 0, y: -20, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: -20, scale: 0.95 }}
           transition={{ type: "spring", duration: 0.5 }}
         >
           <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 overflow-hidden relative">
             {/* Animated background glow */}
             <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/10 to-amber-500/5 animate-pulse" />
             
             <CardContent className="pt-4 pb-4 relative">
               <div className="flex items-start justify-between gap-3">
                 <div className="flex items-start gap-3 flex-1">
                   {/* Alert Icon with animation */}
                   <motion.div
                     animate={{ rotate: [0, -10, 10, -10, 0] }}
                     transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                     className="shrink-0"
                   >
                     <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                       <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                     </div>
                   </motion.div>
 
                   <div className="space-y-2 flex-1">
                     {/* Title */}
                     <div>
                       <h3 className="font-semibold text-foreground flex items-center gap-2">
                         {labels.title}
                         <Flame className="w-4 h-4 text-amber-500" />
                       </h3>
                       <p className="text-sm text-muted-foreground">
                         {labels.subtitle}
                       </p>
                     </div>
 
                     {/* Habit(s) at risk */}
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <span className="font-medium text-foreground">
                           "{primaryHabit.title}"
                         </span>
                         {primaryHabit.currentStreak > 0 && (
                           <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                             🔥 {primaryHabit.currentStreak} {labels.streakDanger}
                           </span>
                         )}
                       </div>
                       
                       {hasMultiple && (
                         <p className="text-xs text-muted-foreground">
                           +{habitsAtRisk.length - 1} {lang === 'de' ? 'weitere' : 'more'} {labels.multiple}
                         </p>
                       )}
                     </div>
 
                     {/* Principle quote */}
                     <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/50 pl-2">
                       {labels.principle}
                     </p>
 
                     {/* Actions */}
                     <div className="flex items-center gap-2 pt-1">
                       <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                         <Link to="/app/entry">
                           {labels.action}
                           <ArrowRight className="ml-1 h-3 w-3" />
                         </Link>
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={handleDismiss}
                         className="text-muted-foreground hover:text-foreground"
                       >
                         {labels.dismiss}
                       </Button>
                     </div>
                   </div>
                 </div>
 
                 {/* Close button */}
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="h-6 w-6 shrink-0"
                   onClick={handleDismiss}
                 >
                   <X className="h-4 w-4" />
                 </Button>
               </div>
             </CardContent>
           </Card>
         </motion.div>
       )}
     </AnimatePresence>
   );
 }