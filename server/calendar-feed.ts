// ICS Calendar Feed Generator for Rehabilitation Schedule
// Supports Google Calendar and Apple Calendar subscription

import { getDb } from "./db";
import { 
  tasks, 
  rehabilitationPhases, 
  rehabilitationPlans, 
  appointments 
} from "../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";

interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  reminder?: number; // minutes before
}

// Generate unique ID for calendar events
function generateUID(prefix: string, id: number): string {
  return `${prefix}-${id}@orthoinnovations.ae`;
}

// Format date to ICS format (YYYYMMDDTHHMMSSZ)
function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape special characters in ICS text
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Generate ICS content for a single event
function generateEventICS(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateToICS(new Date())}`,
    `DTSTART:${formatDateToICS(event.startDate)}`,
    `DTEND:${formatDateToICS(event.endDate)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${escapeICSText(event.description)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  // Add multiple reminders: 60, 30, 7, and 1 day before
  const reminderDays = [60, 30, 7, 1];
  for (const days of reminderDays) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-P${days}D`, // P = Period, D = Days
      `DESCRIPTION:Reminder: ${escapeICSText(event.title)} in ${days} days`,
      'END:VALARM'
    );
  }
  
  // Also add the original minute-based reminder if specified
  if (event.reminder) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${event.reminder}M`,
      `DESCRIPTION:${escapeICSText(event.title)}`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

// Generate full ICS calendar feed
export function generateICSFeed(events: CalendarEvent[], calendarName: string): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ortho Innovations//Patient App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H', // Auto-refresh every hour
    'X-PUBLISHED-TTL:PT1H',
  ].join('\r\n');

  const footer = 'END:VCALENDAR';
  const eventContent = events.map(generateEventICS).join('\r\n');

  return `${header}\r\n${eventContent}\r\n${footer}`;
}

// Get rehabilitation events for a patient
export async function getPatientRehabEvents(patientId: number): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const db = await getDb();
  
  if (!db) {
    console.warn('[Calendar] Database not available');
    return events;
  }

  try {
    // Get rehabilitation tasks
    const taskResults = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        scheduledDate: tasks.scheduledDate,
        duration: tasks.duration,
      })
      .from(tasks)
      .innerJoin(rehabilitationPhases, eq(tasks.phaseId, rehabilitationPhases.id))
      .innerJoin(rehabilitationPlans, eq(rehabilitationPhases.planId, rehabilitationPlans.id))
      .where(
        and(
          eq(rehabilitationPlans.patientId, patientId),
          gte(tasks.scheduledDate, new Date())
        )
      );

    for (const task of taskResults) {
      if (task.scheduledDate) {
        const startDate = new Date(task.scheduledDate);
        const durationMinutes = typeof task.duration === 'string' ? parseInt(task.duration, 10) : (task.duration || 30);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

        events.push({
          uid: generateUID('task', task.id),
          title: task.title,
          description: task.description || 'Rehabilitation exercise',
          startDate,
          endDate,
          reminder: 30, // 30 minutes before
        });
      }
    }

    // Get appointments
    const patientAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patientId),
          gte(appointments.scheduledAt, new Date())
        )
      );

    for (const apt of patientAppointments) {
      const startDate = new Date(apt.scheduledAt);
      const endDate = new Date(startDate.getTime() + (apt.duration || 60) * 60000);

      events.push({
        uid: generateUID('apt', apt.id),
        title: apt.title,
        description: apt.description || 'Medical appointment',
        startDate,
        endDate,
        location: apt.location || 'Ortho Innovations Clinic',
        reminder: 60, // 1 hour before
      });
    }
  } catch (error) {
    console.error('Error fetching calendar events:', error);
  }

  return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

// Generate calendar subscription URL
export function getCalendarSubscriptionURL(baseUrl: string, patientId: number, token: string): {
  webcal: string;
  google: string;
  apple: string;
  outlook: string;
} {
  const icsUrl = `${baseUrl}/api/calendar/${patientId}/feed.ics?token=${token}`;
  const webcalUrl = icsUrl.replace(/^https?:/, 'webcal:');
  
  return {
    webcal: webcalUrl,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
    apple: webcalUrl, // Apple Calendar uses webcal:// directly
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icsUrl)}&name=Ortho%20Innovations%20Rehab`,
  };
}
