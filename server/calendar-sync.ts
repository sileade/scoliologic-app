// Calendar Auto-Sync Service
// Automatically updates patient calendars when doctor changes schedule

import { getDb } from "./db";
import { appointments, tasks, rehabilitationPhases, rehabilitationPlans, patients, notifications } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getPatientRehabEvents, generateICSFeed } from "./calendar-feed";

// Event types that trigger calendar sync
export type CalendarSyncEvent = 
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'phase_updated'
  | 'plan_updated';

interface SyncResult {
  success: boolean;
  patientId: number;
  userId: number;
  eventType: CalendarSyncEvent;
  message: string;
  calendarFeedUpdated: boolean;
  notificationSent: boolean;
}

// Track last sync time for each patient (in production, store in database)
const lastSyncTimes = new Map<number, Date>();

// Generate a unique calendar feed version for cache busting
function generateFeedVersion(): string {
  return Date.now().toString(36);
}

// Notify patient about schedule change
async function notifyPatientAboutChange(
  userId: number,
  eventType: CalendarSyncEvent,
  details: string,
  language: 'ru' | 'en' = 'ru'
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const messages = {
    ru: {
      appointment_created: '📅 Новый приём добавлен в ваше расписание',
      appointment_updated: '📅 Изменения в расписании приёма',
      appointment_deleted: '📅 Приём отменён',
      task_created: '✅ Новое упражнение добавлено в план',
      task_updated: '✅ Изменения в плане упражнений',
      task_deleted: '✅ Упражнение удалено из плана',
      phase_updated: '🔄 Обновление этапа реабилитации',
      plan_updated: '📋 Обновление плана реабилитации',
    },
    en: {
      appointment_created: '📅 New appointment added to your schedule',
      appointment_updated: '📅 Appointment schedule changed',
      appointment_deleted: '📅 Appointment cancelled',
      task_created: '✅ New exercise added to your plan',
      task_updated: '✅ Exercise plan updated',
      task_deleted: '✅ Exercise removed from plan',
      phase_updated: '🔄 Rehabilitation phase updated',
      plan_updated: '📋 Rehabilitation plan updated',
    }
  };

  const calendarUpdateMsg = language === 'ru' 
    ? 'Ваш календарь Google/Apple обновится автоматически.'
    : 'Your Google/Apple calendar will update automatically.';

  try {
    await db.insert(notifications).values({
      userId,
      title: messages[language][eventType],
      message: `${details}\n\n${calendarUpdateMsg}`,
      type: 'info',
      read: false,
    });
    return true;
  } catch (error) {
    console.error('[CalendarSync] Failed to send notification:', error);
    return false;
  }
}

// Main sync function - called when doctor makes changes
export async function syncPatientCalendar(
  patientId: number,
  eventType: CalendarSyncEvent,
  details: string = ''
): Promise<SyncResult> {
  const db = await getDb();
  
  if (!db) {
    return {
      success: false,
      patientId,
      userId: 0,
      eventType,
      message: 'Database not available',
      calendarFeedUpdated: false,
      notificationSent: false,
    };
  }

  try {
    // Get patient's user ID
    const patient = await db
      .select({ userId: patients.userId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient[0]) {
      return {
        success: false,
        patientId,
        userId: 0,
        eventType,
        message: 'Patient not found',
        calendarFeedUpdated: false,
        notificationSent: false,
      };
    }

    const userId = patient[0].userId;
    
    if (!userId) {
      return {
        success: false,
        patientId,
        userId: 0,
        eventType,
        message: 'Patient has no associated user',
        calendarFeedUpdated: false,
        notificationSent: false,
      };
    }

    // Update last sync time (triggers ICS feed regeneration)
    lastSyncTimes.set(patientId, new Date());

    // The ICS feed is dynamically generated, so it will automatically
    // include the latest data when Google/Apple Calendar refreshes
    // (configured for hourly refresh in the ICS feed)

    // Send notification to patient
    const notificationSent = await notifyPatientAboutChange(
      userId,
      eventType,
      details,
      'ru'
    );

    console.log(`[CalendarSync] Synced calendar for patient ${patientId}: ${eventType}`);

    return {
      success: true,
      patientId,
      userId,
      eventType,
      message: 'Calendar sync triggered successfully',
      calendarFeedUpdated: true,
      notificationSent,
    };
  } catch (error) {
    console.error('[CalendarSync] Sync failed:', error);
    return {
      success: false,
      patientId,
      userId: 0,
      eventType,
      message: error instanceof Error ? error.message : 'Unknown error',
      calendarFeedUpdated: false,
      notificationSent: false,
    };
  }
}

// Sync all patients' calendars (for bulk updates)
export async function syncAllPatientCalendars(
  eventType: CalendarSyncEvent,
  details: string = ''
): Promise<SyncResult[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const allPatients = await db
      .select({ id: patients.id })
      .from(patients);

    const results: SyncResult[] = [];
    for (const patient of allPatients) {
      const result = await syncPatientCalendar(patient.id, eventType, details);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('[CalendarSync] Bulk sync failed:', error);
    return [];
  }
}

// Get last sync time for a patient
export function getLastSyncTime(patientId: number): Date | null {
  return lastSyncTimes.get(patientId) || null;
}

// Get calendar feed version (for cache busting)
export function getCalendarFeedVersion(patientId: number): string {
  const lastSync = lastSyncTimes.get(patientId);
  if (lastSync) {
    return lastSync.getTime().toString(36);
  }
  return generateFeedVersion();
}

// Helper function to be called from admin panel when doctor makes changes
export async function onScheduleChange(
  patientId: number,
  changeType: 'appointment' | 'task' | 'phase' | 'plan',
  action: 'create' | 'update' | 'delete',
  details: string
): Promise<SyncResult> {
  const eventType = `${changeType}_${action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted'}` as CalendarSyncEvent;
  return syncPatientCalendar(patientId, eventType, details);
}
