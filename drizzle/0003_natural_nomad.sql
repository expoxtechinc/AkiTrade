CREATE TABLE `brokerConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('ctrader','oanda','mt4_bridge','mt5_bridge') NOT NULL,
	`connectionMode` enum('oauth','server_token','terminal_bridge') NOT NULL,
	`environment` enum('demo','live') NOT NULL DEFAULT 'demo',
	`status` enum('pending','read_only','ready','revoked','error') NOT NULL DEFAULT 'pending',
	`accountReference` varchar(160) NOT NULL,
	`authorizationRef` varchar(191),
	`displayName` varchar(128) NOT NULL,
	`lastVerifiedAt` timestamp,
	`lastHeartbeatAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brokerConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `brokerConnections_user_provider_account_unique` UNIQUE(`userId`,`provider`,`accountReference`)
);
--> statement-breakpoint
CREATE TABLE `executionIntents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brokerConnectionId` int NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`environment` enum('demo','live') NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`quantity` decimal(16,4) NOT NULL,
	`stopLoss` decimal(16,5) NOT NULL,
	`takeProfit` decimal(16,5) NOT NULL,
	`status` enum('validated','rejected','blocked','sent','confirmed','failed') NOT NULL DEFAULT 'validated',
	`rejectionReason` varchar(255),
	`providerOrderReference` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `executionIntents_id` PRIMARY KEY(`id`),
	CONSTRAINT `executionIntents_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `liveTradingConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brokerConnectionId` int NOT NULL,
	`status` enum('pending','acknowledged','revoked') NOT NULL DEFAULT 'pending',
	`acknowledgementVersion` varchar(32) NOT NULL,
	`maxRiskPerTradePercent` decimal(5,2) NOT NULL,
	`maxDailyLoss` decimal(16,2) NOT NULL,
	`acknowledgedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `liveTradingConsents_id` PRIMARY KEY(`id`),
	CONSTRAINT `liveTradingConsents_connection_unique` UNIQUE(`brokerConnectionId`)
);
--> statement-breakpoint
CREATE INDEX `brokerConnections_user_status_idx` ON `brokerConnections` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `executionIntents_connection_created_idx` ON `executionIntents` (`brokerConnectionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `liveTradingConsents_user_status_idx` ON `liveTradingConsents` (`userId`,`status`);