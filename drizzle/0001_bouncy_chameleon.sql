CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`icon` varchar(32),
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`doctorName` varchar(128),
	`location` varchar(256),
	`scheduledAt` timestamp NOT NULL,
	`duration` int DEFAULT 30,
	`status` enum('scheduled','completed','cancelled','no_show') DEFAULT 'scheduled',
	`reminderSent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`content` text,
	`category` enum('exercises','nutrition','recovery','faq') DEFAULT 'recovery',
	`type` enum('article','video') DEFAULT 'article',
	`thumbnail` text,
	`videoUrl` text,
	`duration` varchar(32),
	`views` int DEFAULT 0,
	`featured` boolean DEFAULT false,
	`published` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text,
	`type` enum('info','reminder','alert','success') DEFAULT 'info',
	`read` boolean DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`medicalId` varchar(64),
	`dateOfBirth` timestamp,
	`bloodType` varchar(10),
	`phone` varchar(32),
	`address` text,
	`emergencyContactName` varchar(128),
	`emergencyContactPhone` varchar(32),
	`insuranceProvider` varchar(128),
	`insuranceNumber` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_medicalId_unique` UNIQUE(`medicalId`)
);
--> statement-breakpoint
CREATE TABLE `prostheses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` varchar(128),
	`serialNumber` varchar(128),
	`implantDate` timestamp,
	`surgeon` varchar(128),
	`hospital` varchar(256),
	`warrantyExpiry` timestamp,
	`warrantyStatus` enum('active','expired','void') DEFAULT 'active',
	`qrCode` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prostheses_id` PRIMARY KEY(`id`),
	CONSTRAINT `prostheses_serialNumber_unique` UNIQUE(`serialNumber`)
);
--> statement-breakpoint
CREATE TABLE `rehabilitationPhases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`duration` varchar(64),
	`order` int NOT NULL,
	`status` enum('completed','current','upcoming') DEFAULT 'upcoming',
	`progress` int DEFAULT 0,
	`totalTasks` int DEFAULT 0,
	`completedTasks` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rehabilitationPhases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rehabilitationPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('active','completed','paused') DEFAULT 'active',
	`totalPhases` int DEFAULT 4,
	`currentPhase` int DEFAULT 1,
	`progress` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rehabilitationPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`type` enum('adjustment','checkup','repair','consultation') DEFAULT 'checkup',
	`description` text,
	`status` enum('pending','scheduled','in_progress','completed','cancelled') DEFAULT 'pending',
	`scheduledDate` timestamp,
	`completedAt` timestamp,
	`technicianName` varchar(128),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phaseId` int,
	`patientId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`type` enum('exercise','therapy','activity','medication') DEFAULT 'exercise',
	`duration` varchar(32),
	`videoUrl` text,
	`scheduledDate` timestamp,
	`completed` boolean DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prostheses` ADD CONSTRAINT `prostheses_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rehabilitationPhases` ADD CONSTRAINT `rehabilitationPhases_planId_rehabilitationPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `rehabilitationPlans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rehabilitationPlans` ADD CONSTRAINT `rehabilitationPlans_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceRequests` ADD CONSTRAINT `serviceRequests_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_phaseId_rehabilitationPhases_id_fk` FOREIGN KEY (`phaseId`) REFERENCES `rehabilitationPhases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;