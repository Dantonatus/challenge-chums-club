// Planning module types

export type MilestoneType = 
  | 'contract' 
  | 'kickoff' 
  | 'deadline' 
  | 'meeting' 
  | 'delivery' 
  | 'payment' 
  | 'general';

export type MilestonePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  color: string;
  logo_url: string | null;
  contact_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string | null;
  milestone_type: MilestoneType;
  date: string;
  time: string | null;
  is_completed: boolean;
  completed_at: string | null;
  priority: MilestonePriority;
  location: string | null;
  attendees: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined field
  client?: Client;
}

export interface MilestoneWithClient extends Milestone {
  client: Client;
}

// Form types for creating/editing
export interface ClientFormData {
  name: string;
  color: string;
  contact_email?: string;
  notes?: string;
}

export interface MilestoneFormData {
  title: string;
  client_id: string;
  date: string;
  time?: string;
  milestone_type: MilestoneType;
  description?: string;
  priority?: MilestonePriority;
  location?: string;
  attendees?: string[];
}

// Quarter navigation
export interface Quarter {
  year: number;
  quarter: 1 | 2 | 3 | 4;
}

export function getQuarterMonths(q: Quarter): [number, number, number] {
  const startMonth = (q.quarter - 1) * 3;
  return [startMonth, startMonth + 1, startMonth + 2];
}

export function getQuarterLabel(q: Quarter): string {
  return `Q${q.quarter} ${q.year}`;
}

export function getQuarterDateRange(q: Quarter): { start: Date; end: Date } {
  const startMonth = (q.quarter - 1) * 3;
  const start = new Date(q.year, startMonth, 1);
  const end = new Date(q.year, startMonth + 3, 0);
  return { start, end };
}

export function getCurrentQuarter(): Quarter {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return { year: now.getFullYear(), quarter: quarter as 1 | 2 | 3 | 4 };
}

export function getPreviousQuarter(q: Quarter): Quarter {
  if (q.quarter === 1) {
    return { year: q.year - 1, quarter: 4 };
  }
  return { year: q.year, quarter: (q.quarter - 1) as 1 | 2 | 3 | 4 };
}

export function getNextQuarter(q: Quarter): Quarter {
  if (q.quarter === 4) {
    return { year: q.year + 1, quarter: 1 };
  }
  return { year: q.year, quarter: (q.quarter + 1) as 1 | 2 | 3 | 4 };
}

// Milestone type config
export const MILESTONE_TYPE_CONFIG: Record<MilestoneType, {
  label: string;
  labelDe: string;
  icon: string;
  color: string;
}> = {
  contract: { label: 'Contract', labelDe: 'Vertrag', icon: 'FileSignature', color: 'hsl(217, 91%, 60%)' },
  kickoff: { label: 'Kick-Off', labelDe: 'Kick-Off', icon: 'Rocket', color: 'hsl(142, 71%, 45%)' },
  deadline: { label: 'Deadline', labelDe: 'Deadline', icon: 'AlertTriangle', color: 'hsl(0, 84%, 60%)' },
  meeting: { label: 'Meeting', labelDe: 'Meeting', icon: 'Users', color: 'hsl(270, 76%, 60%)' },
  delivery: { label: 'Delivery', labelDe: 'Lieferung', icon: 'Package', color: 'hsl(174, 72%, 40%)' },
  payment: { label: 'Payment', labelDe: 'Zahlung', icon: 'CreditCard', color: 'hsl(160, 84%, 39%)' },
  general: { label: 'General', labelDe: 'Allgemein', icon: 'Circle', color: 'hsl(215, 16%, 47%)' },
};

// Priority config
export const PRIORITY_CONFIG: Record<MilestonePriority, {
  label: string;
  labelDe: string;
  color: string;
}> = {
  low: { label: 'Low', labelDe: 'Niedrig', color: 'hsl(215, 16%, 47%)' },
  medium: { label: 'Medium', labelDe: 'Mittel', color: 'hsl(45, 93%, 47%)' },
  high: { label: 'High', labelDe: 'Hoch', color: 'hsl(25, 95%, 53%)' },
  critical: { label: 'Critical', labelDe: 'Kritisch', color: 'hsl(0, 84%, 60%)' },
};

// Predefined client colors
export const CLIENT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Purple
];
