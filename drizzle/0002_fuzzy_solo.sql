CREATE TABLE `devicePushTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`platform` enum('android','ios') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devicePushTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `devicePushTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `devicePushTokens_userId_idx` ON `devicePushTokens` (`userId`);