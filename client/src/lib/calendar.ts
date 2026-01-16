// Calendar integration utilities for Google Calendar and Apple Calendar

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  reminder?: number; // minutes before
}

/**
 * Generate Google Calendar URL for adding an event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate ICS file content for Apple Calendar / Outlook
 */
export function generateICSContent(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 15) + 'Z';
  };

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@orthoinnovations.ae`;

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ortho Innovations//Patient App//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${event.title}`;

  if (event.description) {
    ics += `\nDESCRIPTION:${event.description.replace(/\n/g, '\\n')}`;
  }

  if (event.location) {
    ics += `\nLOCATION:${event.location}`;
  }

  if (event.reminder) {
    ics += `
BEGIN:VALARM
TRIGGER:-PT${event.reminder}M
ACTION:DISPLAY
DESCRIPTION:${event.title}
END:VALARM`;
  }

  ics += `
END:VEVENT
END:VCALENDAR`;

  return ics;
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open Google Calendar with event
 */
export function openGoogleCalendar(event: CalendarEvent): void {
  const url = generateGoogleCalendarUrl(event);
  window.open(url, '_blank');
}

/**
 * Add event to calendar (shows dialog with options)
 */
export function addToCalendar(event: CalendarEvent, type: 'google' | 'apple' | 'outlook'): void {
  switch (type) {
    case 'google':
      openGoogleCalendar(event);
      break;
    case 'apple':
    case 'outlook':
      downloadICSFile(event);
      break;
  }
}

/**
 * Create appointment event from appointment data
 */
export function createAppointmentEvent(
  doctorName: string,
  appointmentDate: Date,
  durationMinutes: number = 60,
  location?: string
): CalendarEvent {
  const endDate = new Date(appointmentDate.getTime() + durationMinutes * 60 * 1000);
  
  return {
    title: `Приём у ${doctorName} / Appointment with ${doctorName}`,
    description: `Запись на приём в Ortho Innovations.\n\nAppointment at Ortho Innovations.`,
    location: location || 'Ortho Innovations Clinic',
    startDate: appointmentDate,
    endDate: endDate,
    reminder: 60, // 1 hour before
  };
}

/**
 * Create exercise reminder event
 */
export function createExerciseReminderEvent(
  exerciseName: string,
  scheduledDate: Date,
  durationMinutes: number = 30
): CalendarEvent {
  const endDate = new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);
  
  return {
    title: `Упражнение: ${exerciseName}`,
    description: `Время для выполнения упражнения из вашего плана реабилитации.\n\nTime for your rehabilitation exercise.`,
    startDate: scheduledDate,
    endDate: endDate,
    reminder: 15, // 15 minutes before
  };
}
