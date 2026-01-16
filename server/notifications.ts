// Push Notification Service with Reminder System
// Supports reminders at 60, 30, 7, and 1 day before events

import { getDb } from "./db";
import { notifications, appointments, tasks, rehabilitationPhases, rehabilitationPlans, patients, users } from "../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// Reminder intervals in days
export const REMINDER_INTERVALS = [60, 30, 7, 1] as const;
export type ReminderInterval = typeof REMINDER_INTERVALS[number];

interface ReminderEvent {
  id: number;
  type: 'appointment' | 'task' | 'rehab_milestone';
  title: string;
  description: string;
  eventDate: Date;
  patientId: number;
  userId: number;
}

interface NotificationPayload {
  userId: number;
  title: string;
  message: string;
  type: 'reminder' | 'info' | 'alert' | 'achievement';
  link?: string;
  daysUntilEvent?: number;
}

// Get reminder message based on days until event
function getReminderMessage(
  daysUntil: number, 
  eventTitle: string, 
  language: 'ru' | 'en' = 'ru'
): { title: string; message: string } {
  const messages = {
    ru: {
      60: {
        title: `📅 Напоминание: ${eventTitle}`,
        message: `До события осталось 60 дней. Подготовьтесь заранее!`
      },
      30: {
        title: `📅 Напоминание: ${eventTitle}`,
        message: `До события осталось 30 дней. Не забудьте подготовиться!`
      },
      7: {
        title: `⏰ Скоро: ${eventTitle}`,
        message: `До события осталась неделя. Проверьте свою готовность!`
      },
      1: {
        title: `🔔 Завтра: ${eventTitle}`,
        message: `Событие состоится завтра. Будьте готовы!`
      }
    },
    en: {
      60: {
        title: `📅 Reminder: ${eventTitle}`,
        message: `60 days until the event. Prepare in advance!`
      },
      30: {
        title: `📅 Reminder: ${eventTitle}`,
        message: `30 days until the event. Don't forget to prepare!`
      },
      7: {
        title: `⏰ Coming Soon: ${eventTitle}`,
        message: `One week until the event. Check your readiness!`
      },
      1: {
        title: `🔔 Tomorrow: ${eventTitle}`,
        message: `The event is tomorrow. Be ready!`
      }
    }
  };

  const lang = messages[language];
  const key = daysUntil as keyof typeof lang;
  return lang[key] || lang[1];
}

// Create a notification in the database
export async function createNotification(payload: NotificationPayload): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn('[Notifications] Database not available');
    return false;
  }

  try {
    await db.insert(notifications).values({
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type === 'achievement' ? 'success' : payload.type,
      read: false,
    });
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
    return false;
  }
}

// Get upcoming events that need reminders
export async function getEventsNeedingReminders(): Promise<ReminderEvent[]> {
  const db = await getDb();
  if (!db) return [];

  const events: ReminderEvent[] = [];
  const now = new Date();

  try {
    // Get appointments needing reminders
    for (const days of REMINDER_INTERVALS) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const upcomingAppointments = await db
        .select({
          id: appointments.id,
          title: appointments.title,
          description: appointments.description,
          scheduledAt: appointments.scheduledAt,
          patientId: appointments.patientId,
        })
        .from(appointments)
        .where(
          and(
            gte(appointments.scheduledAt, startOfDay),
            lte(appointments.scheduledAt, endOfDay)
          )
        );

      for (const apt of upcomingAppointments) {
        // Get user ID for this patient
        const patient = await db
          .select({ userId: patients.userId })
          .from(patients)
          .where(eq(patients.id, apt.patientId))
          .limit(1);

        if (patient[0] && patient[0].userId) {
          events.push({
            id: apt.id,
            type: 'appointment',
            title: apt.title,
            description: apt.description || '',
            eventDate: apt.scheduledAt,
            patientId: apt.patientId,
            userId: patient[0].userId,
          });
        }
      }
    }

    // Get rehabilitation tasks needing reminders
    for (const days of REMINDER_INTERVALS) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const upcomingTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          scheduledDate: tasks.scheduledDate,
          phaseId: tasks.phaseId,
        })
        .from(tasks)
        .where(
          and(
            gte(tasks.scheduledDate, startOfDay),
            lte(tasks.scheduledDate, endOfDay)
          )
        );

      for (const task of upcomingTasks) {
        if (!task.scheduledDate || task.phaseId === null) continue;
        
        const taskPhaseId = task.phaseId;

        // Get patient and user for this task - first get the phase, then the plan
        const phase = await db
          .select({ planId: rehabilitationPhases.planId })
          .from(rehabilitationPhases)
          .where(eq(rehabilitationPhases.id, taskPhaseId))
          .limit(1);
        
        if (!phase[0]) continue;
        
        const planId: number = phase[0].planId;
        const plan = await db
          .select({ patientId: rehabilitationPlans.patientId })
          .from(rehabilitationPlans)
          .where(eq(rehabilitationPlans.id, planId))
          .limit(1);
        
        const phaseInfo = plan;

        if (phaseInfo[0]) {
          const patient = await db
            .select({ userId: patients.userId })
            .from(patients)
            .where(eq(patients.id, phaseInfo[0].patientId))
            .limit(1);

          if (patient[0] && patient[0].userId) {
            events.push({
              id: task.id,
              type: 'task',
              title: task.title,
              description: task.description || '',
              eventDate: task.scheduledDate,
              patientId: phaseInfo[0].patientId,
              userId: patient[0].userId,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Notifications] Failed to get events:', error);
  }

  return events;
}

// Process and send reminders for all upcoming events
export async function processReminders(): Promise<number> {
  const events = await getEventsNeedingReminders();
  let sentCount = 0;

  const now = new Date();

  for (const event of events) {
    const daysUntil = Math.ceil((event.eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only send for our specific intervals
    if (!REMINDER_INTERVALS.includes(daysUntil as ReminderInterval)) continue;

    const { title, message } = getReminderMessage(daysUntil, event.title, 'ru');
    
    const success = await createNotification({
      userId: event.userId,
      title,
      message,
      type: 'reminder',
      link: event.type === 'appointment' ? '/rehabilitation' : '/rehabilitation',
      daysUntilEvent: daysUntil,
    });

    if (success) sentCount++;
  }

  console.log(`[Notifications] Processed ${sentCount} reminders`);
  return sentCount;
}

// Generate calendar event with reminders for Google/Apple
export function generateCalendarEventWithReminders(
  event: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    location?: string;
  }
): string {
  const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const lines = [
    'BEGIN:VEVENT',
    `UID:${Date.now()}@orthoinnovations.ae`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.startDate)}`,
    `DTEND:${formatDate(event.endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }

  // Add reminders at 60, 30, 7, and 1 day before
  for (const days of REMINDER_INTERVALS) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-P${days}D`, // P = Period, D = Days
      `DESCRIPTION:Reminder: ${event.title} in ${days} days`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

// Get notification preferences for a user
export async function getNotificationPreferences(userId: number): Promise<{
  emailEnabled: boolean;
  pushEnabled: boolean;
  reminderDays: number[];
}> {
  // Default preferences - in production, store in database
  return {
    emailEnabled: true,
    pushEnabled: true,
    reminderDays: [...REMINDER_INTERVALS],
  };
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: number,
  preferences: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    reminderDays?: number[];
  }
): Promise<boolean> {
  // In production, save to database
  console.log(`[Notifications] Updated preferences for user ${userId}:`, preferences);
  return true;
}
