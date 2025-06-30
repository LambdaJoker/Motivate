-- AlterTable
ALTER TABLE `itinerary` ADD COLUMN `totalEstimatedCost` DECIMAL(65, 30) NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `planitem` ADD COLUMN `estimatedCost` DECIMAL(65, 30) NULL DEFAULT 0;
