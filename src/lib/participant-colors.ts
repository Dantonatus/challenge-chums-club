/**
 * Centralized participant color system
 * Provides consistent, accessible colors for participants across all charts and visualizations
 */

// Custom color palette with 10 distinct colors for participants
const PARTICIPANT_COLORS = [
  "#D32F2F",  // C1 – Tiefes Rubinrot
  "#FBC02D",  // C2 – Strahlendes Goldgelb
  "#388E3C",  // C3 – Sattes Smaragdgrün
  "#7B1FA2",  // C4 – Königliches Violett
  "#F57C00",  // C5 – Intensives Herbstorange
  "#0097A7",  // C6 – Kühles Tief-Türkis
  "#C2185B",  // C7 – Kraftvolles Magenta
  "#AFB42B",  // C8 – Sanftes Olivgold
  "#5D4037",  // C9 – Dunkles Schokoladenbraun
  "#455A64",  // C10 – Kühles Stahlgrau-Blau
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