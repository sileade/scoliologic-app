import { 
  integer, 
  pgEnum, 
  pgTable, 
  text, 
  timestamp, 
  varchar, 
  boolean, 
  json, 
  index,
  serial
} from "drizzle-orm/pg-core";

// PostgreSQL enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const patientStatusEnum = pgEnum("patient_status", ["active", "inactive"]);
export const warrantyStatusEnum = pgEnum("warranty_status", ["active", "expired", "void"]);
export const rehabStatusEnum = pgEnum("rehab_status", ["active", "completed", "paused"]);
export const phaseStatusEnum = pgEnum("phase_status", ["completed", "current", "upcoming"]);
export const taskTypeEnum = pgEnum("task_type", ["exercise", "therapy", "activity", "medication"]);
export const articleCategoryEnum = pgEnum("article_category", ["exercises", "nutrition", "recovery", "faq"]);
export const articleTypeEnum = pgEnum("article_type", ["article", "video", "exercise"]);
export const serviceTypeEnum = pgEnum("service_type", ["adjustment", "checkup", "repair", "consultation"]);
export const serviceStatusEnum = pgEnum("service_status", ["pending", "scheduled", "in_progress", "completed", "cancelled"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "completed", "cancelled", "no_show"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "reminder", "alert", "success"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patient profile with medical information
 */
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  medicalId: varchar("medical_id", { length: 64 }).unique(),
  firstName: varchar("first_name", { length: 128 }),
  lastName: varchar("last_name", { length: 128 }),
  dateOfBirth: timestamp("date_of_birth"),
  bloodType: varchar("blood_type", { length: 10 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  emergencyContactName: varchar("emergency_contact_name", { length: 128 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 32 }),
  insuranceProvider: varchar("insurance_provider", { length: 128 }),
  insuranceNumber: varchar("insurance_number", { length: 64 }),
  status: patientStatusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_patients_user_id").on(table.userId),
  index("idx_patients_status").on(table.status),
]);

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Prosthesis/implant information
 */
export const prostheses = pgTable("prostheses", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 128 }),
  serialNumber: varchar("serial_number", { length: 128 }).unique(),
  implantDate: timestamp("implant_date"),
  surgeon: varchar("surgeon", { length: 128 }),
  hospital: varchar("hospital", { length: 256 }),
  warrantyExpiry: timestamp("warranty_expiry"),
  warrantyStatus: warrantyStatusEnum("warranty_status").default("active"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_prostheses_patient_id").on(table.patientId),
]);

export type Prosthesis = typeof prostheses.$inferSelect;
export type InsertProsthesis = typeof prostheses.$inferInsert;

/**
 * Rehabilitation plans
 */
export const rehabilitationPlans = pgTable("rehabilitation_plans", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  name: varchar("name", { length: 256 }).notNull(),
  title: varchar("title", { length: 256 }),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  duration: integer("duration").default(12),
  prosthesisType: varchar("prosthesis_type", { length: 128 }),
  assignedDoctor: varchar("assigned_doctor", { length: 128 }),
  status: rehabStatusEnum("status").default("active"),
  totalPhases: integer("total_phases").default(4),
  currentPhase: integer("current_phase").default(1),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rehab_plans_patient_id").on(table.patientId),
  index("idx_rehab_plans_status").on(table.status),
]);

export type RehabilitationPlan = typeof rehabilitationPlans.$inferSelect;
export type InsertRehabilitationPlan = typeof rehabilitationPlans.$inferInsert;

/**
 * Rehabilitation phases within a plan
 */
export const rehabilitationPhases = pgTable("rehabilitation_phases", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => rehabilitationPlans.id),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  duration: varchar("duration", { length: 64 }),
  order: integer("order").notNull(),
  status: phaseStatusEnum("status").default("upcoming"),
  progress: integer("progress").default(0),
  totalTasks: integer("total_tasks").default(0),
  completedTasks: integer("completed_tasks").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_rehab_phases_plan_id").on(table.planId),
]);

export type RehabilitationPhase = typeof rehabilitationPhases.$inferSelect;
export type InsertRehabilitationPhase = typeof rehabilitationPhases.$inferInsert;

/**
 * Daily tasks/exercises
 */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").references(() => rehabilitationPhases.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  type: taskTypeEnum("type").default("exercise"),
  duration: varchar("duration", { length: 32 }),
  videoUrl: text("video_url"),
  scheduledDate: timestamp("scheduled_date"),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_tasks_patient_id").on(table.patientId),
  index("idx_tasks_scheduled_date").on(table.scheduledDate),
  index("idx_tasks_phase_id").on(table.phaseId),
]);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Knowledge base articles
 */
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  titleEn: varchar("title_en", { length: 256 }),
  description: text("description"),
  content: text("content"),
  category: articleCategoryEnum("category").default("recovery"),
  type: articleTypeEnum("type").default("article"),
  thumbnail: text("thumbnail"),
  videoUrl: text("video_url"),
  duration: varchar("duration", { length: 32 }),
  views: integer("views").default(0),
  featured: boolean("featured").default(false),
  published: boolean("published").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_articles_category").on(table.category),
  index("idx_articles_type").on(table.type),
]);

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * Service requests
 */
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  type: serviceTypeEnum("type").default("checkup"),
  description: text("description"),
  status: serviceStatusEnum("status").default("pending"),
  scheduledDate: timestamp("scheduled_date"),
  completedAt: timestamp("completed_at"),
  technicianName: varchar("technician_name", { length: 128 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_service_requests_patient_id").on(table.patientId),
  index("idx_service_requests_status").on(table.status),
]);

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Appointments
 */
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  doctorName: varchar("doctor_name", { length: 128 }),
  location: varchar("location", { length: 256 }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30),
  status: appointmentStatusEnum("status").default("scheduled"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_appointments_patient_id").on(table.patientId),
  index("idx_appointments_scheduled_at").on(table.scheduledAt),
  index("idx_appointments_status").on(table.status),
]);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Notifications
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message"),
  type: notificationTypeEnum("type").default("info"),
  read: boolean("read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_read").on(table.read),
]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Achievements/badges for gamification
 */
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 32 }),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
}, (table) => [
  index("idx_achievements_patient_id").on(table.patientId),
]);

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * Messages for secure messenger
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  encryptedContent: text("encrypted_content").notNull(),
  iv: varchar("iv", { length: 64 }).notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_messages_sender_id").on(table.senderId),
  index("idx_messages_receiver_id").on(table.receiverId),
  index("idx_messages_created_at").on(table.createdAt),
]);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * ESIA (Gosuslugi) user data
 */
export const esiaUsers = pgTable("esia_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  esiaOid: varchar("esia_oid", { length: 64 }).notNull().unique(),
  snils: varchar("snils", { length: 14 }),
  inn: varchar("inn", { length: 12 }),
  firstName: varchar("first_name", { length: 128 }),
  lastName: varchar("last_name", { length: 128 }),
  middleName: varchar("middle_name", { length: 128 }),
  birthDate: timestamp("birth_date"),
  gender: varchar("gender", { length: 1 }),
  trusted: boolean("trusted").default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_esia_users_user_id").on(table.userId),
  index("idx_esia_users_esia_oid").on(table.esiaOid),
]);

export type EsiaUser = typeof esiaUsers.$inferSelect;
export type InsertEsiaUser = typeof esiaUsers.$inferInsert;

/**
 * Medical devices from MIS (corsets, orthoses, prostheses)
 */
export const medicalDevices = pgTable("medical_devices", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  misId: varchar("mis_id", { length: 64 }).unique(),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(), // corset, orthosis, prosthesis
  model: varchar("model", { length: 128 }),
  serialNumber: varchar("serial_number", { length: 128 }),
  manufacturer: varchar("manufacturer", { length: 128 }),
  manufacturingDate: timestamp("manufacturing_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  warrantyStatus: warrantyStatusEnum("warranty_status").default("active"),
  lastServiceDate: timestamp("last_service_date"),
  nextServiceDate: timestamp("next_service_date"),
  instructions: text("instructions"),
  notes: text("notes"),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_medical_devices_patient_id").on(table.patientId),
  index("idx_medical_devices_type").on(table.type),
  index("idx_medical_devices_mis_id").on(table.misId),
]);

export type MedicalDevice = typeof medicalDevices.$inferSelect;
export type InsertMedicalDevice = typeof medicalDevices.$inferInsert;
