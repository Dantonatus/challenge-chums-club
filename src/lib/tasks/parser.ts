// Natural language task parser
import { addDays, addWeeks, nextMonday, setHours, setMinutes, format } from 'date-fns';
import type { TaskPriority, CreateTaskInput } from './types';

interface ParsedTask extends Partial<CreateTaskInput> {
  title: string;
  extractedTags: string[];
  extractedProject: string | null;
}

export function parseQuickAdd(input: string): ParsedTask {
  let remaining = input.trim();
  const extractedTags: string[] = [];
  let extractedProject: string | null = null;
  let priority: TaskPriority | undefined;
  let due_date: string | undefined;
  let due_time: string | undefined;

  // Extract priority (P1-P4)
  const priorityMatch = remaining.match(/\b[Pp]([1-4])\b/);
  if (priorityMatch) {
    priority = `p${priorityMatch[1]}` as TaskPriority;
    remaining = remaining.replace(priorityMatch[0], '').trim();
  }

  // Extract tags (#tagname)
  const tagMatches = remaining.matchAll(/#(\w+)/g);
  for (const match of tagMatches) {
    extractedTags.push(match[1]);
    remaining = remaining.replace(match[0], '').trim();
  }

  // Extract project (@projectname)
  const projectMatch = remaining.match(/@(\w+)/);
  if (projectMatch) {
    extractedProject = projectMatch[1];
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
    remaining = remaining.replace(timeMatch[0], '').trim();
  }

  // Extract relative dates
  const today = new Date();
  const lowerRemaining = remaining.toLowerCase();

  if (lowerRemaining.includes('today') || lowerRemaining.includes('heute')) {
    due_date = format(today, 'yyyy-MM-dd');
    remaining = remaining.replace(/\b(today|heute)\b/gi, '').trim();
  } else if (lowerRemaining.includes('tomorrow') || lowerRemaining.includes('morgen')) {
    due_date = format(addDays(today, 1), 'yyyy-MM-dd');
    remaining = remaining.replace(/\b(tomorrow|morgen)\b/gi, '').trim();
  } else if (lowerRemaining.includes('next week') || lowerRemaining.includes('nächste woche')) {
    due_date = format(nextMonday(today), 'yyyy-MM-dd');
    remaining = remaining.replace(/\b(next week|nächste woche)\b/gi, '').trim();
  } else if (lowerRemaining.includes('monday') || lowerRemaining.includes('montag')) {
    due_date = format(nextMonday(today), 'yyyy-MM-dd');
    remaining = remaining.replace(/\b(monday|montag)\b/gi, '').trim();
  }

  // Clean up extra spaces
  remaining = remaining.replace(/\s+/g, ' ').trim();

  return {
    title: remaining || 'Untitled task',
    priority,
    due_date,
    due_time,
    extractedTags,
    extractedProject,
  };
}

export function getSnoozeDate(option: 'later' | 'tomorrow' | 'next_week'): Date {
  const now = new Date();
  
  switch (option) {
    case 'later':
      return setMinutes(setHours(now, now.getHours() + 2), 0);
    case 'tomorrow':
      return setHours(addDays(now, 1), 9);
    case 'next_week':
      return setHours(nextMonday(now), 9);
    default:
      return now;
  }
}
