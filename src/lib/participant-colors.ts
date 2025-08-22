/**
 * Centralized participant color system
 * Provides consistent, accessible colors for participants across all charts and visualizations
 */

// Modern aqua-teal color palette with 10 distinct colors for participants
const PARTICIPANT_COLORS = [
  "#26C6DA",  // C1 – Helles Türkis
  "#29B6F6",  // C2 – Sanftes Himmelblau
  "#66BB6A",  // C3 – Frisches Smaragdgrün
  "#00BCD4",  // C4 – Lebendiges Cyan
  "#4FC3F7",  // C5 – Warmes Seeblau
  "#4CAF50",  // C6 – Natürliches Grün
  "#0288D1",  // C7 – Tiefes Ozeanblau
  "#4DB6AC",  // C8 – Minze Grün
  "#1DE9B6",  // C9 – Aqua Türkis
  "#009688",  // C10 – Sanftes Teal
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
 * Now supports custom user colors from their profile
 */
export function generateParticipantColorMap(
  participants: Array<{ user_id: string; name?: string; custom_color?: string }>
): Record<string, string> {
  // Sort participants by user_id to ensure consistent color assignment
  const sortedParticipants = [...participants].sort((a, b) => a.user_id.localeCompare(b.user_id));
  
  const colorMap: Record<string, string> = {};
  sortedParticipants.forEach((participant, index) => {
    // Use custom color if available, otherwise fall back to default palette
    colorMap[participant.user_id] = participant.custom_color || getParticipantColor(index);
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