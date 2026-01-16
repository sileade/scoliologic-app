ALTER TABLE `articles` MODIFY COLUMN `type` enum('article','video','exercise') DEFAULT 'article';--> statement-breakpoint
ALTER TABLE `patients` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `titleEn` varchar(256);--> statement-breakpoint
ALTER TABLE `patients` ADD `firstName` varchar(128);--> statement-breakpoint
ALTER TABLE `patients` ADD `lastName` varchar(128);--> statement-breakpoint
ALTER TABLE `patients` ADD `status` enum('active','inactive') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `rehabilitationPlans` ADD `title` varchar(256);--> statement-breakpoint
ALTER TABLE `rehabilitationPlans` ADD `duration` int DEFAULT 12;--> statement-breakpoint
ALTER TABLE `rehabilitationPlans` ADD `prosthesisType` varchar(128);--> statement-breakpoint
ALTER TABLE `rehabilitationPlans` ADD `assignedDoctor` varchar(128);