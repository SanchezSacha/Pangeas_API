ALTER TABLE `user_visits`
    ADD COLUMN `place_category` ENUM('nature', 'urbain', 'historique', 'frisson', 'secret') NULL;

ALTER TABLE `partners`
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `rewards`
    ADD COLUMN `discount_percent` INTEGER NULL,
    ADD COLUMN `minimum_purchase` DECIMAL(10, 2) NULL,
    ADD COLUMN `max_discount` DECIMAL(10, 2) NULL,
    ADD COLUMN `scope` VARCHAR(120) NULL,
    ADD COLUMN `terms` TEXT NULL,
    ADD COLUMN `starts_at` DATETIME(3) NULL,
    ADD COLUMN `ends_at` DATETIME(3) NULL,
    ADD COLUMN `per_user_limit` INTEGER NOT NULL DEFAULT 1;

ALTER TABLE `reward_redemptions`
    ADD COLUMN `client_request_id` VARCHAR(80) NULL;

CREATE UNIQUE INDEX `reward_redemptions_client_request_id_key`
    ON `reward_redemptions`(`client_request_id`);

CREATE INDEX `reward_redemptions_reward_id_status_idx`
    ON `reward_redemptions`(`reward_id`, `status`);

ALTER TABLE `donation_campaigns`
    ADD COLUMN `budget_amount` DECIMAL(10, 2) NULL,
    ADD COLUMN `points_per_euro` INTEGER NOT NULL DEFAULT 400;

ALTER TABLE `donations`
    ADD COLUMN `status` ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
    ADD COLUMN `client_request_id` VARCHAR(80) NULL,
    ADD COLUMN `confirmed_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `donations_client_request_id_key`
    ON `donations`(`client_request_id`);

CREATE INDEX `donations_campaign_id_status_idx`
    ON `donations`(`campaign_id`, `status`);
