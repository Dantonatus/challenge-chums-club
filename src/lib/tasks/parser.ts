// Enhanced Natural language task parser with feedback
import { addDays, addWeeks, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, format } from 'date-fns';
import type { TaskPriority, RecurringFrequency, CreateTaskInput } from './types';

export interface ParsedTask extends Partial<CreateTaskInput> {
  title: string;
  extractedTags: string[];
  extractedProject: string | null;
  // Feedback for UI display
  feedback: ParseFeedback;
}

export interface ParseFeedback {
  date: { label: string; value: string } | null;
  time: { label: string; value: string } | null;
  priority: { label: string; value: TaskPriority } | null;
  recurrence: { label: string; value: RecurringFrequency } | null;
  tags: string[];
  project: string | null;
}

// Day name mappings (English + German)
const DAY_MAPPINGS: Record<string, (date: Date) => Date> = {
  'monday': nextMonday,
  'montag': nextMonday,
  'tuesday': nextTuesday,
  'dienstag': nextTuesday,
  'wednesday': nextWednesday,
  'mittwoch': nextWednesday,
  'thursday': nextThursday,
  'donnerstag': nextThursday,
  'friday': nextFriday,
  'freitag': nextFriday,
  'saturday': nextSaturday,
  'samstag': nextSaturday,
  'sunday': nextSunday,
  'sonntag': nextSunday,
};

// Recurrence patterns
const RECURRENCE_PATTERNS: { pattern: RegExp; value: RecurringFrequency; label: string }[] = [
  { pattern: /\b(every day|täglich|daily)\b/i, value: 'daily', label: 'Täglich' },
  { pattern: /\b(every week|wöchentlich|weekly)\b/i, value: 'weekly', label: 'Wöchentlich' },
  { pattern: /\b(every month|monatlich|monthly)\b/i, value: 'monthly', label: 'Monatlich' },
  { pattern: /\bevery (monday|montag)\b/i, value: 'weekly', label: 'Jeden Montag' },
  { pattern: /\bevery (tuesday|dienstag)\b/i, value: 'weekly', label: 'Jeden Dienstag' },
  { pattern: /\bevery (wednesday|mittwoch)\b/i, value: 'weekly', label: 'Jeden Mittwoch' },
  { pattern: /\bevery (thursday|donnerstag)\b/i, value: 'weekly', label: 'Jeden Donnerstag' },
  { pattern: /\bevery (friday|freitag)\b/i, value: 'weekly', label: 'Jeden Freitag' },
];

export function parseQuickAdd(input: string): ParsedTask {
  let remaining = input.trim();
  const extractedTags: string[] = [];
  let extractedProject: string | null = null;
  let priority: TaskPriority | undefined;
  let due_date: string | undefined;
  let due_time: string | undefined;
  let recurring_frequency: RecurringFrequency | undefined;

  const feedback: ParseFeedback = {
    date: null,
    time: null,
    priority: null,
    recurrence: null,
    tags: [],
    project: null,
  };

  const today = new Date();

  // Extract priority (P1-P4)
  const priorityMatch = remaining.match(/\b[Pp]([1-4])\b/);
  if (priorityMatch) {
    priority = `p${priorityMatch[1]}` as TaskPriority;
    feedback.priority = {
      label: `P${priorityMatch[1]}`,
      value: priority,
    };
    remaining = remaining.replace(priorityMatch[0], '').trim();
  }

  // Extract recurrence patterns
  for (const { pattern, value, label } of RECURRENCE_PATTERNS) {
    const match = remaining.match(pattern);
    if (match) {
      recurring_frequency = value;
      feedback.recurrence = { label, value };
      remaining = remaining.replace(match[0], '').trim();
      break;
    }
  }

  // Extract tags (#tagname)
  const tagMatches = remaining.matchAll(/#(\w+)/g);
  for (const match of tagMatches) {
    extractedTags.push(match[1]);
    feedback.tags.push(match[1]);
    remaining = remaining.replace(match[0], '').trim();
  }

  // Extract project (@projectname)
  const projectMatch = remaining.match(/@(\w+)/);
  if (projectMatch) {
    extractedProject = projectMatch[1];
    feedback.project = projectMatch[1];
    remaining = remaining.replace(projectMatch[0], '').trim();
  }

  // Extract time (14:00, 2pm, etc.)
  const timeMatch = remaining.match(/\b(\d{1,2}):(\d{2})\b/) || 
                    remaining.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2]?.match(/\d+/) ? parseInt(timeMatch[2]) : 0;
    
    if (timeMatch[2]?.toLowerCase() === 'pm' && hours < 12) hours += 12;
    if (timeMatch[2]?.toLowerCase() === 'am' && hours === 12) hours = 0;
    
    due_time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    feedback.time = {
      label: `${due_time} Uhr`,
      value: due_time,
    };
    remaining = remaining.replace(timeMatch[0], '').trim();
  }

  // Extract relative dates - "in X days/weeks"
  const inDaysMatch = remaining.match(/\bin (\d+) (day|days|tag|tage|tagen)\b/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    due_date = format(addDays(today, days), 'yyyy-MM-dd');
    feedback.date = {
      label: `In ${days} ${days === 1 ? 'Tag' : 'Tagen'}`,
      value: due_date,
    };
    remaining = remaining.replace(inDaysMatch[0], '').trim();
  }

  const inWeeksMatch = remaining.match(/\bin (\d+) (week|weeks|woche|wochen)\b/i);
  if (!due_date && inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1]);
    due_date = format(addWeeks(today, weeks), 'yyyy-MM-dd');
    feedback.date = {
      label: `In ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`,
      value: due_date,
    };
    remaining = remaining.replace(inWeeksMatch[0], '').trim();
  }

  // Extract specific day names
  const lowerRemaining = remaining.toLowerCase();
  
  if (!due_date) {
    for (const [dayName, getNextDay] of Object.entries(DAY_MAPPINGS)) {
      if (lowerRemaining.includes(dayName)) {
        due_date = format(getNextDay(today), 'yyyy-MM-dd');
        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        feedback.date = {
          label: capitalizedDay,
          value: due_date,
        };
        remaining = remaining.replace(new RegExp(`\\b${dayName}\\b`, 'gi'), '').trim();
        break;
      }
    }
  }

  // Extract common date phrases
  if (!due_date) {
    if (lowerRemaining.includes('today') || lowerRemaining.includes('heute')) {
      due_date = format(today, 'yyyy-MM-dd');
      feedback.date = { label: 'Heute', value: due_date };
      remaining = remaining.replace(/\b(today|heute)\b/gi, '').trim();
    } else if (lowerRemaining.includes('tomorrow') || lowerRemaining.includes('morgen')) {
      due_date = format(addDays(today, 1), 'yyyy-MM-dd');
      feedback.date = { label: 'Morgen', value: due_date };
      remaining = remaining.replace(/\b(tomorrow|morgen)\b/gi, '').trim();
    } else if (lowerRemaining.includes('next week') || lowerRemaining.includes('nächste woche')) {
      due_date = format(nextMonday(today), 'yyyy-MM-dd');
      feedback.date = { label: 'Nächste Woche', value: due_date };
      remaining = remaining.replace(/\b(next week|nächste woche)\b/gi, '').trim();
    } else if (lowerRemaining.includes('übermorgen')) {
      due_date = format(addDays(today, 2), 'yyyy-MM-dd');
      feedback.date = { label: 'Übermorgen', value: due_date };
      remaining = remaining.replace(/\bübermorgen\b/gi, '').trim();
    }
  }

  // Clean up extra spaces
  remaining = remaining.replace(/\s+/g, ' ').trim();

  return {
    title: remaining || 'Untitled task',
    priority,
    due_date,
    due_time,
    recurring_frequency,
    extractedTags,
    extractedProject,
    feedback,
  };
}

export function getSnoozeDate(option: 'later' | 'tomorrow' | 'next_week'): Date {
  const now = new Date();
  
  switch (option) {
    case 'later':
      return new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    case 'tomorrow':
      const tomorrow = addDays(now, 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    case 'next_week':
      const monday = nextMonday(now);
      monday.setHours(9, 0, 0, 0);
      return monday;
    default:
      return now;
  }
}