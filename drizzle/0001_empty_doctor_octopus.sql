CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(96) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backtestRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`strategyId` int,
	`symbol` varchar(32) NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`startingBalance` decimal(16,2) NOT NULL,
	`endingBalance` decimal(16,2) NOT NULL,
	`status` enum('completed','failed') NOT NULL DEFAULT 'completed',
	`metrics` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backtestRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decisionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`strategyId` int,
	`symbol` varchar(32) NOT NULL,
	`decision` enum('buy','sell','wait') NOT NULL,
	`markPrice` decimal(16,5) NOT NULL,
	`rationale` text NOT NULL,
	`riskStatus` enum('approved','blocked','not_applicable') NOT NULL,
	`riskReason` varchar(255),
	`orderCreated` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decisionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('trade_opened','trade_closed','daily_loss_limit') NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`relatedPositionId` int,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notifyTradeOpened` boolean NOT NULL DEFAULT true,
	`notifyTradeClosed` boolean NOT NULL DEFAULT true,
	`notifyDailyLossLimit` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `paperPositions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`strategyId` int,
	`decisionEventId` int,
	`symbol` varchar(32) NOT NULL,
	`side` enum('buy','sell') NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`quantity` decimal(12,2) NOT NULL,
	`entryPrice` decimal(16,5) NOT NULL,
	`markPrice` decimal(16,5) NOT NULL,
	`stopLoss` decimal(16,5) NOT NULL,
	`takeProfit` decimal(16,5) NOT NULL,
	`riskAmount` decimal(16,2) NOT NULL,
	`realizedPnl` decimal(16,2) NOT NULL DEFAULT '0.00',
	`closedPrice` decimal(16,5),
	`closeReason` varchar(64),
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `paperPositions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `riskControls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`maxRiskPerTradePercent` decimal(5,2) NOT NULL DEFAULT '1.00',
	`maxDailyLoss` decimal(16,2) NOT NULL DEFAULT '250.00',
	`maxTradesPerDay` int NOT NULL DEFAULT 5,
	`maxOpenPositions` int NOT NULL DEFAULT 2,
	`requireStopLoss` boolean NOT NULL DEFAULT true,
	`requireTakeProfit` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `riskControls_id` PRIMARY KEY(`id`),
	CONSTRAINT `riskControls_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `tradingInstruments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(32) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradingInstruments_id` PRIMARY KEY(`id`),
	CONSTRAINT `tradingInstruments_user_symbol_unique` UNIQUE(`userId`,`symbol`)
);
--> statement-breakpoint
CREATE TABLE `tradingProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(128) NOT NULL DEFAULT 'Paper workspace',
	`operatingMode` enum('paper','live') NOT NULL DEFAULT 'paper',
	`liveTradingEnabled` boolean NOT NULL DEFAULT false,
	`automationStatus` enum('stopped','running','paused') NOT NULL DEFAULT 'stopped',
	`accountLabel` varchar(128) NOT NULL DEFAULT 'Demo / Paper',
	`baseCurrency` varchar(8) NOT NULL DEFAULT 'USD',
	`startingBalance` decimal(16,2) NOT NULL DEFAULT '10000.00',
	`bridgeStatus` enum('not_configured','healthy','degraded','offline') NOT NULL DEFAULT 'not_configured',
	`lastBridgeHeartbeatAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradingProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `tradingProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `tradingStrategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`strategyType` enum('moving_average','momentum','mean_reversion') NOT NULL DEFAULT 'moving_average',
	`isActive` boolean NOT NULL DEFAULT true,
	`parameters` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradingStrategies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `auditEvents_user_created_idx` ON `auditEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `backtestRuns_user_created_idx` ON `backtestRuns` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `decisionEvents_user_created_idx` ON `decisionEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notificationEvents_user_created_idx` ON `notificationEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `paperPositions_user_status_idx` ON `paperPositions` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `paperPositions_user_opened_idx` ON `paperPositions` (`userId`,`openedAt`);--> statement-breakpoint
CREATE INDEX `tradingStrategies_userId_idx` ON `tradingStrategies` (`userId`);