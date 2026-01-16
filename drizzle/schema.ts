import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patient profile with medical information
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  medicalId: varchar("medicalId", { length: 64 }).unique(),
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  dateOfBirth: timestamp("dateOfBirth"),
  bloodType: varchar("bloodType", { length: 10 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  emergencyContactName: varchar("emergencyContactName", { length: 128 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 32 }),
  insuranceProvider: varchar("insuranceProvider", { length: 128 }),
  insuranceNumber: varchar("insuranceNumber", { length: 64 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_patients_userId").on(table.userId),
  index("idx_patients_status").on(table.status),
]);

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Prosthesis/implant information
 */
export const prostheses = mysqlTable("prostheses", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  name: varchar("name", { length: 256 }).notNull(),
  type: varchar("type", { length: 128 }),
  serialNumber: varchar("serialNumber", { length: 128 }).unique(),
  implantDate: timestamp("implantDate"),
  surgeon: varchar("surgeon", { length: 128 }),
  hospital: varchar("hospital", { length: 256 }),
  warrantyExpiry: timestamp("warrantyExpiry"),
  warrantyStatus: mysqlEnum("warrantyStatus", ["active", "expired", "void"]).default("active"),
  qrCode: text("qrCode"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_prostheses_patientId").on(table.patientId),
]);

export type Prosthesis = typeof prostheses.$inferSelect;
export type InsertProsthesis = typeof prostheses.$inferInsert;

/**
 * Rehabilitation plans
 */
export const rehabilitationPlans = mysqlTable("rehabilitationPlans", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  name: varchar("name", { length: 256 }).notNull(),
  title: varchar("title", { length: 256 }),
  description: text("description"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  duration: int("duration").default(12),
  prosthesisType: varchar("prosthesisType", { length: 128 }),
  assignedDoctor: varchar("assignedDoctor", { length: 128 }),
  status: mysqlEnum("status", ["active", "completed", "paused"]).default("active"),
  totalPhases: int("totalPhases").default(4),
  currentPhase: int("currentPhase").default(1),
  progress: int("progress").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_rehabPlans_patientId").on(table.patientId),
  index("idx_rehabPlans_status").on(table.status),
]);

export type RehabilitationPlan = typeof rehabilitationPlans.$inferSelect;
export type InsertRehabilitationPlan = typeof rehabilitationPlans.$inferInsert;

/**
 * Rehabilitation phases within a plan
 */
export const rehabilitationPhases = mysqlTable("rehabilitationPhases", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull().references(() => rehabilitationPlans.id),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  duration: varchar("duration", { length: 64 }),
  order: int("order").notNull(),
  status: mysqlEnum("status", ["completed", "current", "upcoming"]).default("upcoming"),
  progress: int("progress").default(0),
  totalTasks: int("totalTasks").default(0),
  completedTasks: int("completedTasks").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_rehabPhases_planId").on(table.planId),
]);

export type RehabilitationPhase = typeof rehabilitationPhases.$inferSelect;
export type InsertRehabilitationPhase = typeof rehabilitationPhases.$inferInsert;

/**
 * Daily tasks/exercises
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  phaseId: int("phaseId").references(() => rehabilitationPhases.id),
  patientId: int("patientId").notNull().references(() => patients.id),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["exercise", "therapy", "activity", "medication"]).default("exercise"),
  duration: varchar("duration", { length: 32 }),
  videoUrl: text("videoUrl"),
  scheduledDate: timestamp("scheduledDate"),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_tasks_patientId").on(table.patientId),
  index("idx_tasks_scheduledDate").on(table.scheduledDate),
  index("idx_tasks_phaseId").on(table.phaseId),
]);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Knowledge base articles
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  titleEn: varchar("titleEn", { length: 256 }),
  description: text("description"),
  content: text("content"),
  category: mysqlEnum("category", ["exercises", "nutrition", "recovery", "faq"]).default("recovery"),
  type: mysqlEnum("type", ["article", "video", "exercise"]).default("article"),
  thumbnail: text("thumbnail"),
  videoUrl: text("videoUrl"),
  duration: varchar("duration", { length: 32 }),
  views: int("views").default(0),
  featured: boolean("featured").default(false),
  published: boolean("published").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_articles_category").on(table.category),
  index("idx_articles_type").on(table.type),
]);

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * Service requests
 */
export const serviceRequests = mysqlTable("serviceRequests", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  type: mysqlEnum("type", ["adjustment", "checkup", "repair", "consultation"]).default("checkup"),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "scheduled", "in_progress", "completed", "cancelled"]).default("pending"),
  scheduledDate: timestamp("scheduledDate"),
  completedAt: timestamp("completedAt"),
  technicianName: varchar("technicianName", { length: 128 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_serviceRequests_patientId").on(table.patientId),
  index("idx_serviceRequests_status").on(table.status),
]);

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Appointments
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  doctorName: varchar("doctorName", { length: 128 }),
  location: varchar("location", { length: 256 }),
  scheduledAt: timestamp("scheduledAt").notNull(),
  duration: int("duration").default(30),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"),
  reminderSent: boolean("reminderSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_appointments_patientId").on(table.patientId),
  index("idx_appointments_scheduledAt").on(table.scheduledAt),
  index("idx_appointments_status").on(table.status),
]);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message"),
  type: mysqlEnum("type", ["info", "reminder", "alert", "success"]).default("info"),
  read: boolean("read").default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_userId").on(table.userId),
  index("idx_notifications_read").on(table.read),
]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Achievements/badges for gamification
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 32 }),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
}, (table) => [
  index("idx_achievements_patientId").on(table.patientId),
]);

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
