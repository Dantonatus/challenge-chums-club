 import { useState } from "react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Progress } from "@/components/ui/progress";
 import { Trophy, ChevronRight, Sparkles } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { motion, AnimatePresence } from "framer-motion";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import { UnlockedAchievement, Achievement, ACHIEVEMENTS } from "@/lib/achievements";
 
 interface AchievementBadgesProps {
   unlockedAchievements: UnlockedAchievement[];
   nextGoal: {
     achievement: Achievement;
     progress: number;
     max: number;
     habitTitle?: string;
   } | null;
   lang: "de" | "en";
 }
 
 const t = {
   de: {
     title: "Errungenschaften",
     viewAll: "Alle anzeigen",
     nextGoal: "Nächstes Ziel",
     noAchievements: "Noch keine Errungenschaften",
     keepGoing: "Mach weiter so!",
     allAchievements: "Alle Errungenschaften",
     unlocked: "Freigeschaltet",
     locked: "Noch nicht erreicht",
     with: "mit",
   },
   en: {
     title: "Achievements",
     viewAll: "View all",
     nextGoal: "Next goal",
     noAchievements: "No achievements yet",
     keepGoing: "Keep going!",
     allAchievements: "All Achievements",
     unlocked: "Unlocked",
     locked: "Not yet achieved",
     with: "with",
   },
 };
 
 export function AchievementBadges({
   unlockedAchievements,
   nextGoal,
   lang,
 }: AchievementBadgesProps) {
   const labels = t[lang];
   const [dialogOpen, setDialogOpen] = useState(false);
 
   // Show first 4 unlocked achievements
   const displayedAchievements = unlockedAchievements.slice(0, 4);
   const hasMore = unlockedAchievements.length > 4;
 
   // Get locked achievements
   const unlockedIds = unlockedAchievements.map(a => a.id);
   const lockedAchievements = ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id));
 
   return (
     <Card>
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between">
           <CardTitle className="text-base flex items-center gap-2">
             <Trophy className="h-4 w-4 text-amber-500" />
             {labels.title}
           </CardTitle>
           {unlockedAchievements.length > 0 && (
             <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
               <DialogTrigger asChild>
                 <Button variant="ghost" size="sm" className="text-xs">
                   {labels.viewAll}
                   <ChevronRight className="ml-1 h-3 w-3" />
                 </Button>
               </DialogTrigger>
               <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                 <DialogHeader>
                   <DialogTitle className="flex items-center gap-2">
                     <Trophy className="h-5 w-5 text-amber-500" />
                     {labels.allAchievements}
                   </DialogTitle>
                 </DialogHeader>
                 
                 {/* Unlocked */}
                 {unlockedAchievements.length > 0 && (
                   <div className="space-y-3">
                     <h4 className="text-sm font-medium text-muted-foreground">
                       {labels.unlocked} ({unlockedAchievements.length})
                     </h4>
                     <div className="grid grid-cols-2 gap-2">
                       {unlockedAchievements.map((achievement) => (
                         <AchievementCard 
                           key={achievement.id} 
                           achievement={achievement} 
                           lang={lang}
                           unlocked 
                         />
                       ))}
                     </div>
                   </div>
                 )}
 
                 {/* Locked */}
                 {lockedAchievements.length > 0 && (
                   <div className="space-y-3 mt-4">
                     <h4 className="text-sm font-medium text-muted-foreground">
                       {labels.locked} ({lockedAchievements.length})
                     </h4>
                     <div className="grid grid-cols-2 gap-2">
                       {lockedAchievements.map((achievement) => (
                         <AchievementCard 
                           key={achievement.id} 
                           achievement={achievement} 
                           lang={lang}
                           unlocked={false} 
                         />
                       ))}
                     </div>
                   </div>
                 )}
               </DialogContent>
             </Dialog>
           )}
         </div>
       </CardHeader>
 
       <CardContent className="space-y-4">
         {unlockedAchievements.length === 0 ? (
           <div className="text-center py-4">
             <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
             <p className="text-sm text-muted-foreground">{labels.noAchievements}</p>
             <p className="text-xs text-muted-foreground mt-1">{labels.keepGoing}</p>
           </div>
         ) : (
           <>
             {/* Badge grid */}
             <div className="flex flex-wrap gap-2 justify-center">
               {displayedAchievements.map((achievement, index) => (
                 <motion.div
                   key={achievement.id}
                   initial={{ scale: 0, rotate: -10 }}
                   animate={{ scale: 1, rotate: 0 }}
                   transition={{ delay: index * 0.1, type: "spring" }}
                 >
                   <div 
                     className={cn(
                       "w-14 h-14 rounded-xl flex flex-col items-center justify-center",
                       "bg-gradient-to-br shadow-md cursor-pointer hover:scale-110 transition-transform",
                       achievement.color
                     )}
                     title={`${achievement.name[lang]}: ${achievement.description[lang]}`}
                   >
                     <span className="text-xl">{achievement.icon}</span>
                     <span className="text-[10px] text-white font-medium mt-0.5">
                       {achievement.type === 'streak' && `${achievement.threshold}d`}
                       {achievement.type === 'rate' && `${achievement.threshold}%`}
                       {achievement.type === 'milestone' && `${achievement.threshold}`}
                       {achievement.type === 'starter' && '✓'}
                     </span>
                   </div>
                 </motion.div>
               ))}
               
               {hasMore && (
                 <div 
                   className="w-14 h-14 rounded-xl flex items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                   onClick={() => setDialogOpen(true)}
                 >
                   <span className="text-xs text-muted-foreground font-medium">
                     +{unlockedAchievements.length - 4}
                   </span>
                 </div>
               )}
             </div>
 
             {/* Next goal */}
             {nextGoal && (
               <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                 <div className="flex items-center justify-between text-xs">
                   <span className="text-muted-foreground">{labels.nextGoal}:</span>
                   <span className="font-medium flex items-center gap-1">
                     {nextGoal.achievement.icon} {nextGoal.achievement.name[lang]}
                   </span>
                 </div>
                 <Progress 
                   value={(nextGoal.progress / nextGoal.max) * 100} 
                   className="h-2"
                 />
                 <div className="flex items-center justify-between text-xs text-muted-foreground">
                   <span>{nextGoal.progress} / {nextGoal.max}</span>
                   {nextGoal.habitTitle && (
                     <span>{labels.with} "{nextGoal.habitTitle}"</span>
                   )}
                 </div>
               </div>
             )}
           </>
         )}
       </CardContent>
     </Card>
   );
 }
 
 function AchievementCard({ 
   achievement, 
   lang, 
   unlocked 
 }: { 
   achievement: Achievement | UnlockedAchievement; 
   lang: "de" | "en";
   unlocked: boolean;
 }) {
   return (
     <div 
       className={cn(
         "p-3 rounded-lg border transition-all",
         unlocked 
           ? "bg-gradient-to-br border-primary/20 " + achievement.color.replace('from-', 'from-').replace('to-', 'to-') + "/10"
           : "bg-muted/30 border-muted opacity-60 grayscale"
       )}
     >
       <div className="flex items-center gap-2">
         <span className="text-2xl">{achievement.icon}</span>
         <div className="flex-1 min-w-0">
           <p className="text-sm font-medium truncate">{achievement.name[lang]}</p>
           <p className="text-xs text-muted-foreground truncate">
             {achievement.description[lang]}
           </p>
         </div>
       </div>
     </div>
   );
 }