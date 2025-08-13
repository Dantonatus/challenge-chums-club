/**
 * Centralized participant color system
 * Provides consistent, accessible colors for participants across all charts and visualizations
 */

// High contrast, accessible color palette optimized for charts and dashboards
const PARTICIPANT_COLORS = [
  "hsl(var(--primary))",        // Primary brand color
  "hsl(217 91% 60%)",          // Bright blue - excellent contrast
  "hsl(142 76% 36%)",          // Strong green - nature inspired
  "hsl(38 92% 50%)",           // Vibrant orange - warm accent
  "hsl(348 83% 47%)",          // Strong red - attention grabbing
  "hsl(271 81% 56%)",          // Purple - creative energy
  "hsl(195 85% 41%)",          // Teal - professional calm
  "hsl(55 92% 50%)",           // Bright yellow - energetic
  "hsl(314 100% 45%)",         // Magenta - distinctive
  "hsl(24 100% 50%)",          // Deep orange - warm balance
  "hsl(262 83% 58%)",          // Violet - elegant depth
  "hsl(173 80% 40%)",          // Aqua - refreshing
];

/**
 * Get a color for a participant by their index
 * Colors cycle through the palette if there are more participants than colors
 */
export function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}

/**
 * Get all participant colors as an array
 */
export function getParticipantColors(): string[] {
  return [...PARTICIPANT_COLORS];
}

/**
 * Generate a color map for participants based on their user IDs
 * This ensures consistent colors for the same participant across different charts
 */
export function generateParticipantColorMap(participants: Array<{ user_id: string; name?: string }>): Record<string, string> {
  // Sort participants by user_id to ensure consistent color assignment
  const sortedParticipants = [...participants].sort((a, b) => a.user_id.localeCompare(b.user_id));
  
  const colorMap: Record<string, string> = {};
  sortedParticipants.forEach((participant, index) => {
    colorMap[participant.user_id] = getParticipantColor(index);
  });
  
  return colorMap;
}

/**
 * Generate chart config for recharts components
 */
export function generateChartConfig(participants: Array<{ user_id: string; name: string }>): Record<string, { label: string; color: string }> {
  const colorMap = generateParticipantColorMap(participants);
  
  const config: Record<string, { label: string; color: string }> = {};
  participants.forEach((participant) => {
    config[participant.name] = {
      label: participant.name,
      color: colorMap[participant.user_id]
    };
  });
  
  return config;
}