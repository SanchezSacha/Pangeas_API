-- AlterEnum
ALTER TABLE `place_submissions`
    MODIFY `status` ENUM('pending', 'needs_changes', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `place_submissions`
    ADD COLUMN `client_request_id` VARCHAR(80) NULL,
    ADD COLUMN `reviewed_at` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `place_submissions_client_request_id_key`
    ON `place_submissions`(`client_request_id`);

-- CreateIndex
CREATE INDEX `place_submissions_user_id_created_at_idx`
    ON `place_submissions`(`user_id`, `created_at`);
