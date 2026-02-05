 // Achievement System - Types and Definitions
 
 export interface Achievement {
   id: string;
   name: { de: string; en: string };
   description: { de: string; en: string };
   icon: string;
   type: 'streak' | 'rate' | 'milestone' | 'starter';
   threshold: number;
   color: string;
 }
 
 export interface UnlockedAchievement extends Achievement {
   unlockedAt: Date;
   habitTitle?: string;
 }
 
 export const ACHIEVEMENTS: Achievement[] = [
   // Streak Achievements
   {
     id: 'streak_7',
     name: { de: '7-Tage Flamme', en: '7-Day Flame' },
     description: { de: '7 Tage am Stück geschafft', en: '7 consecutive days completed' },
     icon: '🔥',
     type: 'streak',
     threshold: 7,
     color: 'from-orange-500 to-red-500',
   },
   {
     id: 'streak_30',
     name: { de: 'Monats-Meister', en: 'Month Master' },
     description: { de: '30 Tage am Stück geschafft', en: '30 consecutive days completed' },
     icon: '🔥',
     type: 'streak',
     threshold: 30,
     color: 'from-orange-600 to-red-600',
   },
   {
     id: 'streak_100',
     name: { de: 'Hundert-Tage-Held', en: 'Hundred-Day Hero' },
     description: { de: '100 Tage am Stück geschafft', en: '100 consecutive days completed' },
     icon: '💯',
     type: 'streak',
     threshold: 100,
     color: 'from-purple-500 to-pink-500',
   },
   {
     id: 'streak_365',
     name: { de: 'Jahres-Legende', en: 'Year Legend' },
     description: { de: '365 Tage am Stück geschafft', en: '365 consecutive days completed' },
     icon: '👑',
     type: 'streak',
     threshold: 365,
     color: 'from-yellow-500 to-amber-500',
   },
   
   // Success Rate Achievements
   {
     id: 'rate_50',
     name: { de: 'Halbzeit', en: 'Halfway There' },
     description: { de: '50% Erfolgsquote erreicht', en: '50% success rate achieved' },
     icon: '⭐',
     type: 'rate',
     threshold: 50,
     color: 'from-blue-400 to-cyan-400',
   },
   {
     id: 'rate_75',
     name: { de: 'Silber-Status', en: 'Silver Status' },
     description: { de: '75% Erfolgsquote erreicht', en: '75% success rate achieved' },
     icon: '🥈',
     type: 'rate',
     threshold: 75,
     color: 'from-gray-400 to-slate-400',
   },
   {
     id: 'rate_90',
     name: { de: 'Gold-Status', en: 'Gold Status' },
     description: { de: '90% Erfolgsquote erreicht', en: '90% success rate achieved' },
     icon: '🥇',
     type: 'rate',
     threshold: 90,
     color: 'from-yellow-400 to-amber-400',
   },
   
   // Milestone Achievements
   {
     id: 'entries_10',
     name: { de: 'Erste Schritte', en: 'First Steps' },
     description: { de: '10 Einträge gemacht', en: '10 entries logged' },
     icon: '👣',
     type: 'milestone',
     threshold: 10,
     color: 'from-green-400 to-emerald-400',
   },
   {
     id: 'entries_100',
     name: { de: 'Gewohnheits-Jäger', en: 'Habit Hunter' },
     description: { de: '100 Einträge gemacht', en: '100 entries logged' },
     icon: '🎯',
     type: 'milestone',
     threshold: 100,
     color: 'from-indigo-400 to-violet-400',
   },
   
   // Starter Achievements
   {
     id: 'first_habit',
     name: { de: 'Starter', en: 'Starter' },
     description: { de: 'Erstes Habit erstellt', en: 'First habit created' },
     icon: '🌱',
     type: 'starter',
     threshold: 1,
     color: 'from-green-500 to-teal-500',
   },
   {
     id: 'first_week',
     name: { de: 'Erste Woche', en: 'First Week' },
     description: { de: 'Eine Woche dabei', en: 'One week in' },
     icon: '📅',
     type: 'starter',
     threshold: 7,
     color: 'from-blue-500 to-indigo-500',
   },
 ];
 
 export function calculateAchievements(
   habitStats: Array<{
     longestStreak: number;
     successRate: number;
     totalEntries: number;
     title: string;
   }>,
   totalHabits: number
 ): UnlockedAchievement[] {
   const unlocked: UnlockedAchievement[] = [];
   const now = new Date();
 
   // Check starter achievements
   if (totalHabits >= 1) {
     const achievement = ACHIEVEMENTS.find(a => a.id === 'first_habit');
     if (achievement) {
       unlocked.push({ ...achievement, unlockedAt: now });
     }
   }
 
   // Check per-habit achievements
   habitStats.forEach(habit => {
     // Streak achievements
     ACHIEVEMENTS.filter(a => a.type === 'streak').forEach(achievement => {
       if (habit.longestStreak >= achievement.threshold) {
         // Only add if not already unlocked with higher threshold
         const existing = unlocked.find(u => u.id === achievement.id);
         if (!existing) {
           unlocked.push({ ...achievement, unlockedAt: now, habitTitle: habit.title });
         }
       }
     });
 
     // Rate achievements (need minimum 10 entries)
     if (habit.totalEntries >= 10) {
       ACHIEVEMENTS.filter(a => a.type === 'rate').forEach(achievement => {
         if (habit.successRate >= achievement.threshold) {
           const existing = unlocked.find(u => u.id === achievement.id);
           if (!existing) {
             unlocked.push({ ...achievement, unlockedAt: now, habitTitle: habit.title });
           }
         }
       });
     }
 
     // Milestone achievements
     ACHIEVEMENTS.filter(a => a.type === 'milestone').forEach(achievement => {
       if (habit.totalEntries >= achievement.threshold) {
         const existing = unlocked.find(u => u.id === achievement.id);
         if (!existing) {
           unlocked.push({ ...achievement, unlockedAt: now, habitTitle: habit.title });
         }
       }
     });
   });
 
   return unlocked;
 }
 
 export function getNextAchievement(
   habitStats: Array<{
     longestStreak: number;
     successRate: number;
     totalEntries: number;
     currentStreak: number;
     title: string;
   }>,
   unlockedIds: string[]
 ): { achievement: Achievement; progress: number; max: number; habitTitle?: string } | null {
   // Find closest unachieved goal
   let closest: { achievement: Achievement; progress: number; max: number; habitTitle?: string } | null = null;
   let closestGap = Infinity;
 
   habitStats.forEach(habit => {
     // Check streak achievements
     ACHIEVEMENTS.filter(a => a.type === 'streak' && !unlockedIds.includes(a.id)).forEach(achievement => {
       const gap = achievement.threshold - habit.currentStreak;
       if (gap > 0 && gap < closestGap) {
         closestGap = gap;
         closest = {
           achievement,
           progress: habit.currentStreak,
           max: achievement.threshold,
           habitTitle: habit.title,
         };
       }
     });
 
     // Check rate achievements
     if (habit.totalEntries >= 5) {
       ACHIEVEMENTS.filter(a => a.type === 'rate' && !unlockedIds.includes(a.id)).forEach(achievement => {
         const gap = achievement.threshold - habit.successRate;
         if (gap > 0 && gap < closestGap) {
           closestGap = gap;
           closest = {
             achievement,
             progress: Math.round(habit.successRate),
             max: achievement.threshold,
             habitTitle: habit.title,
           };
         }
       });
     }
   });
 
   return closest;
 }