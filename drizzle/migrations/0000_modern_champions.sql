CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."article_category" AS ENUM('exercises', 'nutrition', 'recovery', 'faq');--> statement-breakpoint
CREATE TYPE "public"."article_type" AS ENUM('article', 'video', 'exercise');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'reminder', 'alert', 'success');--> statement-breakpoint
CREATE TYPE "public"."patient_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."phase_status" AS ENUM('completed', 'current', 'upcoming');--> statement-breakpoint
CREATE TYPE "public"."rehab_status" AS ENUM('active', 'completed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('pending', 'scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('adjustment', 'checkup', 'repair', 'consultation');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('exercise', 'therapy', 'activity', 'medication');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."warranty_status" AS ENUM('active', 'expired', 'void');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"icon" varchar(32),
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"doctor_name" varchar(128),
	"location" varchar(256),
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 30,
	"status" "appointment_status" DEFAULT 'scheduled',
	"reminder_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"title_en" varchar(256),
	"description" text,
	"content" text,
	"category" "article_category" DEFAULT 'recovery',
	"type" "article_type" DEFAULT 'article',
	"thumbnail" text,
	"video_url" text,
	"duration" varchar(32),
	"views" integer DEFAULT 0,
	"featured" boolean DEFAULT false,
	"published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esia_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"esia_oid" varchar(64) NOT NULL,
	"snils" varchar(14),
	"inn" varchar(12),
	"first_name" varchar(128),
	"last_name" varchar(128),
	"middle_name" varchar(128),
	"birth_date" timestamp,
	"gender" varchar(1),
	"trusted" boolean DEFAULT false,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "esia_users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "esia_users_esia_oid_unique" UNIQUE("esia_oid")
);
--> statement-breakpoint
CREATE TABLE "medical_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"mis_id" varchar(64),
	"name" varchar(256) NOT NULL,
	"type" varchar(64) NOT NULL,
	"model" varchar(128),
	"serial_number" varchar(128),
	"manufacturer" varchar(128),
	"manufacturing_date" timestamp,
	"warranty_expiry" timestamp,
	"warranty_status" "warranty_status" DEFAULT 'active',
	"last_service_date" timestamp,
	"next_service_date" timestamp,
	"instructions" text,
	"notes" text,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_devices_mis_id_unique" UNIQUE("mis_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"encrypted_content" text NOT NULL,
	"iv" varchar(64) NOT NULL,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"message" text,
	"type" "notification_type" DEFAULT 'info',
	"read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"medical_id" varchar(64),
	"first_name" varchar(128),
	"last_name" varchar(128),
	"date_of_birth" timestamp,
	"blood_type" varchar(10),
	"phone" varchar(32),
	"address" text,
	"emergency_contact_name" varchar(128),
	"emergency_contact_phone" varchar(32),
	"insurance_provider" varchar(128),
	"insurance_number" varchar(64),
	"status" "patient_status" DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_medical_id_unique" UNIQUE("medical_id")
);
--> statement-breakpoint
CREATE TABLE "prostheses" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" varchar(128),
	"serial_number" varchar(128),
	"implant_date" timestamp,
	"surgeon" varchar(128),
	"hospital" varchar(256),
	"warranty_expiry" timestamp,
	"warranty_status" "warranty_status" DEFAULT 'active',
	"qr_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prostheses_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "rehabilitation_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"duration" varchar(64),
	"order" integer NOT NULL,
	"status" "phase_status" DEFAULT 'upcoming',
	"progress" integer DEFAULT 0,
	"total_tasks" integer DEFAULT 0,
	"completed_tasks" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rehabilitation_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"title" varchar(256),
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"duration" integer DEFAULT 12,
	"prosthesis_type" varchar(128),
	"assigned_doctor" varchar(128),
	"status" "rehab_status" DEFAULT 'active',
	"total_phases" integer DEFAULT 4,
	"current_phase" integer DEFAULT 1,
	"progress" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"type" "service_type" DEFAULT 'checkup',
	"description" text,
	"status" "service_status" DEFAULT 'pending',
	"scheduled_date" timestamp,
	"completed_at" timestamp,
	"technician_name" varchar(128),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase_id" integer,
	"patient_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"type" "task_type" DEFAULT 'exercise',
	"duration" varchar(32),
	"video_url" text,
	"scheduled_date" timestamp,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esia_users" ADD CONSTRAINT "esia_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_devices" ADD CONSTRAINT "medical_devices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prostheses" ADD CONSTRAINT "prostheses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehabilitation_phases" ADD CONSTRAINT "rehabilitation_phases_plan_id_rehabilitation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."rehabilitation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_rehabilitation_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."rehabilitation_phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_achievements_patient_id" ON "achievements" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient_id" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_scheduled_at" ON "appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_articles_category" ON "articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_articles_type" ON "articles" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_esia_users_user_id" ON "esia_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_esia_users_esia_oid" ON "esia_users" USING btree ("esia_oid");--> statement-breakpoint
CREATE INDEX "idx_medical_devices_patient_id" ON "medical_devices" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_medical_devices_type" ON "medical_devices" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_medical_devices_mis_id" ON "medical_devices" USING btree ("mis_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender_id" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_messages_receiver_id" ON "messages" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "idx_messages_created_at" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "idx_patients_user_id" ON "patients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_patients_status" ON "patients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prostheses_patient_id" ON "prostheses" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_rehab_phases_plan_id" ON "rehabilitation_phases" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_rehab_plans_patient_id" ON "rehabilitation_plans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_rehab_plans_status" ON "rehabilitation_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_service_requests_patient_id" ON "service_requests" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_service_requests_status" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_patient_id" ON "tasks" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_scheduled_date" ON "tasks" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_phase_id" ON "tasks" USING btree ("phase_id");