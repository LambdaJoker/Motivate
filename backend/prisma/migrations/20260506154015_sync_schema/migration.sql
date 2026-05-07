-- AlterTable
ALTER TABLE `itinerary` ADD COLUMN `generationParams` TEXT NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `planitem` MODIFY `description` TEXT NULL;
