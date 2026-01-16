import { eq, and, desc, sql, like, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  patients, 
  prostheses, 
  rehabilitationPlans, 
  rehabilitationPhases, 
  tasks, 
  articles, 
  serviceRequests, 
  appointments, 
  notifications, 
  achievements,
  Task
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Ensure patient record exists for user
export async function ensurePatientExists(openId: string, name: string | null) {
  const db = await getDb();
  if (!db) return null;
  
  // Get user by openId
  const userResult = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (userResult.length === 0) return null;
  
  const user = userResult[0];
  
  // Check if patient already exists
  const existingPatient = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
  if (existingPatient.length > 0) return existingPatient[0];
  
  // Create new patient record
  const firstName = name?.split(' ')[0] || 'Пациент';
  const lastName = name?.split(' ').slice(1).join(' ') || '';
  const medicalId = `P${String(user.id).padStart(5, '0')}`;
  
  await db.insert(patients).values({
    userId: user.id,
    medicalId,
    firstName,
    lastName,
    status: 'active',
  });
  
  // Return the newly created patient
  const newPatient = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
  return newPatient.length > 0 ? newPatient[0] : null;
}

// Patient queries
export async function getPatientByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePatientProfile(userId: number, data: {
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return null;
  
  await db.update(patients).set(data).where(eq(patients.id, patient.id));
  return getPatientByUserId(userId);
}

// Update patient by ID (admin)
export async function updatePatientById(patientId: number, data: {
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  // Get patient to find userId for email update
  const patientResult = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (patientResult.length === 0) return null;
  const patient = patientResult[0];
  
  const patientUpdateData: Record<string, any> = {};
  if (data.name !== undefined) {
    // Split name into firstName and lastName
    const nameParts = data.name.trim().split(' ');
    patientUpdateData.firstName = nameParts[0] || null;
    patientUpdateData.lastName = nameParts.slice(1).join(' ') || null;
  }
  if (data.phone !== undefined) patientUpdateData.phone = data.phone;
  if (data.dateOfBirth !== undefined) patientUpdateData.dateOfBirth = new Date(data.dateOfBirth);
  
  // Update patient table
  if (Object.keys(patientUpdateData).length > 0) {
    await db.update(patients).set(patientUpdateData).where(eq(patients.id, patientId));
  }
  
  // Update user email if provided and userId exists
  if (data.email !== undefined && patient.userId) {
    await db.update(users).set({ email: data.email }).where(eq(users.id, patient.userId));
  }
  
  return getPatientById(patientId);
}

// Prosthesis queries
export async function getPatientProsthesis(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return null;
  
  const result = await db.select().from(prostheses).where(eq(prostheses.patientId, patient.id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Rehabilitation queries
export async function getPatientRehabPlan(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return null;
  
  const result = await db.select()
    .from(rehabilitationPlans)
    .where(and(
      eq(rehabilitationPlans.patientId, patient.id),
      eq(rehabilitationPlans.status, "active")
    ))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getRehabPhases(planId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(rehabilitationPhases)
    .where(eq(rehabilitationPhases.planId, planId))
    .orderBy(rehabilitationPhases.order);
}

export async function getTodaysTasks(userId: number): Promise<Task[]> {
  const db = await getDb();
  if (!db) return [];
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return db.select()
    .from(tasks)
    .where(and(
      eq(tasks.patientId, patient.id),
      sql`${tasks.scheduledDate} >= ${today}`,
      sql`${tasks.scheduledDate} < ${tomorrow}`
    ))
    .orderBy(tasks.scheduledDate);
}

export async function completeTask(taskId: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(tasks)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(tasks.id, taskId));
  
  const result = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Article queries
export async function getArticles(filters?: {
  category?: string;
  search?: string;
  featured?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(articles).where(eq(articles.published, true));
  
  const conditions = [eq(articles.published, true)];
  
  if (filters?.category && filters.category !== "all") {
    conditions.push(eq(articles.category, filters.category as "exercises" | "nutrition" | "recovery" | "faq"));
  }
  
  if (filters?.featured) {
    conditions.push(eq(articles.featured, true));
  }
  
  if (filters?.search) {
    conditions.push(
      or(
        like(articles.title, `%${filters.search}%`),
        like(articles.description, `%${filters.search}%`)
      )!
    );
  }
  
  return db.select()
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.createdAt));
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function incrementArticleViews(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(articles)
    .set({ views: sql`${articles.views} + 1` })
    .where(eq(articles.id, id));
}

// Service request queries
export async function getServiceRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return [];
  
  return db.select()
    .from(serviceRequests)
    .where(eq(serviceRequests.patientId, patient.id))
    .orderBy(desc(serviceRequests.createdAt));
}

export async function createServiceRequest(userId: number, data: {
  type: "adjustment" | "checkup" | "repair" | "consultation";
  description: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return null;
  
  const result = await db.insert(serviceRequests).values({
    patientId: patient.id,
    type: data.type,
    description: data.description,
    status: "pending",
  });
  
  return { id: result[0].insertId, ...data, status: "pending" };
}

export async function cancelServiceRequest(userId: number, requestId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return null;
  
  // Verify the request belongs to this patient
  const existingRequest = await db.select()
    .from(serviceRequests)
    .where(and(
      eq(serviceRequests.id, requestId),
      eq(serviceRequests.patientId, patient.id)
    ))
    .limit(1);
  
  if (!existingRequest.length) return null;
  
  // Only allow cancelling pending requests
  if (existingRequest[0].status !== 'pending') {
    return { error: 'Cannot cancel non-pending request' };
  }
  
  await db.update(serviceRequests)
    .set({ status: 'cancelled' })
    .where(eq(serviceRequests.id, requestId));
  
  return { id: requestId, status: 'cancelled' };
}

// Appointment queries
export async function getUpcomingAppointments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return [];
  
  const now = new Date();
  
  return db.select()
    .from(appointments)
    .where(and(
      eq(appointments.patientId, patient.id),
      eq(appointments.status, "scheduled"),
      sql`${appointments.scheduledAt} >= ${now}`
    ))
    .orderBy(appointments.scheduledAt)
    .limit(5);
}

export async function getAllAppointments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return [];
  
  return db.select()
    .from(appointments)
    .where(eq(appointments.patientId, patient.id))
    .orderBy(desc(appointments.scheduledAt));
}

// Notification queries
export async function getNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.read, false)
    ));
}

// Achievement queries
export async function getAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const patient = await getPatientByUserId(userId);
  if (!patient) return [];
  
  return db.select()
    .from(achievements)
    .where(eq(achievements.patientId, patient.id))
    .orderBy(desc(achievements.earnedAt));
}

// Admin functions for creating/updating appointments and tasks

export async function createAppointment(data: {
  patientId: number;
  title: string;
  description?: string;
  scheduledAt: Date;
  duration?: number;
  doctorName?: string;
  location?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(appointments).values({
    patientId: data.patientId,
    title: data.title,
    description: data.description,
    scheduledAt: data.scheduledAt,
    duration: data.duration || 60,
    doctorName: data.doctorName,
    location: data.location,
    status: "scheduled",
  });
  
  return { id: result[0].insertId, ...data, status: "scheduled" };
}

export async function updateAppointment(id: number, data: {
  title?: string;
  description?: string;
  scheduledAt?: Date;
  duration?: number;
  status?: "scheduled" | "completed" | "cancelled";
}) {
  const db = await getDb();
  if (!db) return null;
  
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt;
  if (data.duration !== undefined) updateData.duration = data.duration;
  if (data.status !== undefined) updateData.status = data.status;
  
  if (Object.keys(updateData).length === 0) return null;
  
  await db.update(appointments)
    .set(updateData)
    .where(eq(appointments.id, id));
  
  return { id, ...data };
}

export async function createTask(data: {
  patientId: number;
  phaseId?: number;
  title: string;
  description?: string;
  type?: "exercise" | "therapy" | "activity" | "medication";
  duration?: string;
  scheduledDate?: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(tasks).values({
    patientId: data.patientId,
    phaseId: data.phaseId,
    title: data.title,
    description: data.description,
    type: data.type || "exercise",
    duration: data.duration,
    scheduledDate: data.scheduledDate,
    completed: false,
  });
  
  return { id: result[0].insertId, ...data, completed: false };
}


// ==================== ADMIN FUNCTIONS ====================

// Get all patients with optional filtering
export async function getAllPatients(filters?: {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.search) {
    conditions.push(
      or(
        like(patients.firstName, `%${filters.search}%`),
        like(patients.lastName, `%${filters.search}%`)
      )!
    );
  }
  
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(patients.status, filters.status));
  }
  
  const query = conditions.length > 0 
    ? db.select().from(patients).where(and(...conditions))
    : db.select().from(patients);
  
  return query.orderBy(desc(patients.createdAt));
}

// Get patient by ID with full details
export async function getPatientById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  if (result.length === 0) return null;
  
  const patient = result[0];
  
  // Get user data for name and email
  let userData = null;
  if (patient.userId) {
    const userResult = await db.select().from(users).where(eq(users.id, patient.userId)).limit(1);
    userData = userResult[0] || null;
  }
  
  // Get related data
  const [prosthesis, rehabPlan, appointmentsList] = await Promise.all([
    db.select().from(prostheses).where(eq(prostheses.patientId, id)).limit(1),
    db.select().from(rehabilitationPlans).where(eq(rehabilitationPlans.patientId, id)).limit(1),
    db.select().from(appointments).where(eq(appointments.patientId, id)).orderBy(desc(appointments.scheduledAt)).limit(10),
  ]);
  
  // Combine firstName and lastName for display name
  const displayName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || userData?.name || null;
  
  return {
    ...patient,
    name: displayName,
    email: userData?.email || null,
    prosthesis: prosthesis[0] || null,
    rehabPlan: rehabPlan[0] || null,
    appointments: appointmentsList,
  };
}

// Get all rehabilitation plans
export async function getAllRehabPlans(filters?: {
  status?: 'active' | 'paused' | 'completed' | 'all';
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(rehabilitationPlans.status, filters.status));
  }
  
  const query = conditions.length > 0
    ? db.select().from(rehabilitationPlans).where(and(...conditions))
    : db.select().from(rehabilitationPlans);
  
  return query.orderBy(desc(rehabilitationPlans.createdAt));
}

// Create rehabilitation plan
export async function createRehabPlan(data: {
  patientId: number;
  title: string;
  duration: number;
  prosthesisType: string;
  assignedDoctor: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(rehabilitationPlans).values({
    patientId: data.patientId,
    name: data.title, // Required field
    title: data.title,
    duration: data.duration,
    prosthesisType: data.prosthesisType,
    assignedDoctor: data.assignedDoctor,
    status: 'active',
    progress: 0,
    startDate: new Date(),
  });
  
  return { id: result[0].insertId, ...data, status: 'active' };
}

// Update rehabilitation plan status
export async function updateRehabPlanStatus(id: number, status: 'active' | 'paused' | 'completed') {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(rehabilitationPlans)
    .set({ status })
    .where(eq(rehabilitationPlans.id, id));
  
  return { id, status };
}

// Get all content (articles, videos, exercises)
export async function getAllContent(filters?: {
  type?: 'article' | 'video' | 'exercise' | 'all';
  category?: string;
  status?: 'published' | 'draft' | 'all';
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.type && filters.type !== 'all') {
    conditions.push(eq(articles.type, filters.type));
  }
  
  if (filters?.category) {
    conditions.push(eq(articles.category, filters.category as "exercises" | "nutrition" | "recovery" | "faq"));
  }
  
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(articles.published, filters.status === 'published'));
  }
  
  const query = conditions.length > 0
    ? db.select().from(articles).where(and(...conditions))
    : db.select().from(articles);
  
  return query.orderBy(desc(articles.createdAt));
}

// Create content
export async function createContent(data: {
  titleRu: string;
  titleEn: string;
  type: 'article' | 'video' | 'exercise';
  category: string;
  content?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(articles).values({
    title: data.titleRu,
    titleEn: data.titleEn,
    type: data.type,
    category: data.category as "exercises" | "nutrition" | "recovery" | "faq",
    content: data.content,
    published: false,
    views: 0,
  });
  
  return { id: result[0].insertId, ...data, published: false };
}

// Update content
export async function updateContent(id: number, data: {
  titleRu?: string;
  titleEn?: string;
  category?: string;
  status?: 'published' | 'draft';
}) {
  const db = await getDb();
  if (!db) return null;
  
  const updateData: Record<string, unknown> = {};
  if (data.titleRu !== undefined) updateData.title = data.titleRu;
  if (data.titleEn !== undefined) updateData.titleEn = data.titleEn;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.status !== undefined) updateData.published = data.status === 'published';
  
  if (Object.keys(updateData).length === 0) return null;
  
  await db.update(articles)
    .set(updateData)
    .where(eq(articles.id, id));
  
  return { id, ...data };
}

// Delete content
export async function deleteContent(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db.delete(articles).where(eq(articles.id, id));
  return { id, deleted: true };
}

// Get all orders/service requests
export async function getAllOrders(filters?: {
  status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'all';
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(serviceRequests.status, filters.status));
  }
  
  // Get service requests with patient data
  const requests = conditions.length > 0
    ? await db.select().from(serviceRequests).where(and(...conditions)).orderBy(desc(serviceRequests.createdAt))
    : await db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  
  // Map to expected format with patient info
  const ordersWithPatients = await Promise.all(requests.map(async (request) => {
    // Get patient info
    const patientResult = await db.select().from(patients).where(eq(patients.id, request.patientId)).limit(1);
    const patient = patientResult[0];
    
    // Map service type to display names
    const serviceNames: Record<string, { ru: string; en: string }> = {
      'adjustment': { ru: 'Настройка протеза', en: 'Prosthesis Adjustment' },
      'checkup': { ru: 'Осмотр', en: 'Check-up' },
      'repair': { ru: 'Ремонт протеза', en: 'Prosthesis Repair' },
      'consultation': { ru: 'Консультация', en: 'Consultation' },
    };
    
    // Map status from DB to frontend format
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'scheduled': 'confirmed',
      'in_progress': 'in-progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
    };
    
    return {
      id: request.id,
      orderNumber: `ORD-${String(request.id).padStart(4, '0')}`,
      patient: {
        name: patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Пациент' : 'Пациент',
        phone: patient?.phone || '',
        email: '',
      },
      service: serviceNames[request.type || 'checkup'] || { ru: 'Услуга', en: 'Service' },
      date: request.scheduledDate ? new Date(request.scheduledDate).toISOString().split('T')[0] : '',
      time: request.scheduledDate ? new Date(request.scheduledDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
      status: statusMap[request.status || 'pending'] || 'pending',
      specialist: request.technicianName || 'Не назначен',
      notes: request.notes || '',
      price: 0,
    };
  }));
  
  return ordersWithPatients;
}

// Update order status
export async function updateOrderStatus(id: number, status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled') {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(serviceRequests)
    .set({ status })
    .where(eq(serviceRequests.id, id));
  
  return { id, status };
}

// Get calendar appointments for admin
export async function getCalendarAppointments(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(appointments)
    .where(and(
      sql`${appointments.scheduledAt} >= ${new Date(startDate)}`,
      sql`${appointments.scheduledAt} <= ${new Date(endDate)}`
    ))
    .orderBy(appointments.scheduledAt);
}

// Create broadcast notification
export async function createBroadcastNotification(data: {
  titleRu: string;
  titleEn: string;
  messageRu: string;
  messageEn: string;
  type: 'info' | 'reminder' | 'alert' | 'success';
  audience: 'all' | 'active' | 'specific';
  patientIds?: number[];
  scheduledFor?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  // Get target users based on audience
  let targetUserIds: number[] = [];
  
  if (data.audience === 'all' || data.audience === 'active') {
    const patientsList = await db.select({ userId: patients.userId })
      .from(patients)
      .where(data.audience === 'active' ? eq(patients.status, 'active') : sql`1=1`);
    targetUserIds = patientsList.map(p => p.userId!).filter(Boolean);
  } else if (data.patientIds && data.patientIds.length > 0) {
    const patientsList = await db.select({ userId: patients.userId })
      .from(patients)
      .where(inArray(patients.id, data.patientIds));
    targetUserIds = patientsList.map(p => p.userId!).filter(Boolean);
  }
  
  // Create notifications for all target users
  const notificationsToInsert = targetUserIds.map(userId => ({
    userId,
    title: data.titleRu,
    message: data.messageRu,
    type: data.type,
    read: false,
  }));
  
  if (notificationsToInsert.length > 0) {
    await db.insert(notifications).values(notificationsToInsert);
  }
  
  return { 
    sent: notificationsToInsert.length, 
    audience: data.audience,
    scheduledFor: data.scheduledFor 
  };
}

// Get sent notifications (admin view)
export async function getSentNotifications() {
  const db = await getDb();
  if (!db) return [];
  
  // Get recent unique notifications grouped by title
  return db.select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

// Get analytics data
export async function getAnalyticsData(period: 'week' | 'month' | 'year') {
  const db = await getDb();
  if (!db) return null;
  
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }
  
  const [
    totalPatients,
    activePatients,
    totalAppointments,
    completedTasks,
    serviceRequestsCount
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(patients),
    db.select({ count: sql<number>`count(*)` }).from(patients).where(eq(patients.status, 'active')),
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(sql`${appointments.scheduledAt} >= ${startDate}`),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.completed, true), sql`${tasks.completedAt} >= ${startDate}`)),
    db.select({ count: sql<number>`count(*)` }).from(serviceRequests).where(sql`${serviceRequests.createdAt} >= ${startDate}`),
  ]);
  
  return {
    totalPatients: totalPatients[0]?.count || 0,
    activePatients: activePatients[0]?.count || 0,
    totalAppointments: totalAppointments[0]?.count || 0,
    completedTasks: completedTasks[0]?.count || 0,
    serviceRequests: serviceRequestsCount[0]?.count || 0,
    period,
  };
}

// Get admin dashboard stats
export async function getAdminDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [
    totalPatients,
    activeRehabPlans,
    todayAppointments,
    pendingOrders,
    recentArticles
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(patients),
    db.select({ count: sql<number>`count(*)` }).from(rehabilitationPlans).where(eq(rehabilitationPlans.status, 'active')),
    db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(
      sql`${appointments.scheduledAt} >= ${today}`,
      sql`${appointments.scheduledAt} < ${tomorrow}`
    )),
    db.select({ count: sql<number>`count(*)` }).from(serviceRequests).where(eq(serviceRequests.status, 'pending')),
    db.select({ count: sql<number>`count(*)` }).from(articles).where(eq(articles.published, true)),
  ]);
  
  return {
    totalPatients: totalPatients[0]?.count || 0,
    activeRehabPlans: activeRehabPlans[0]?.count || 0,
    todayAppointments: todayAppointments[0]?.count || 0,
    pendingOrders: pendingOrders[0]?.count || 0,
    publishedArticles: recentArticles[0]?.count || 0,
  };
}
