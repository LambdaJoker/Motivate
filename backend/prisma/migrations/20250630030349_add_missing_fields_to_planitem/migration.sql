/*
  Warnings:

  - You are about to alter the column `longitude` on the `planitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,7)`.
  - You are about to alter the column `estimatedCost` on the `planitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE `planitem` ADD COLUMN `endTime` DATETIME(3) NULL,
    ADD COLUMN `itemType` VARCHAR(191) NULL,
    MODIFY `longitude` DECIMAL(10, 7) NOT NULL,
    MODIFY `transportMode` ENUM('driving', 'walking', 'bicycling', 'transit') NULL,
    MODIFY `estimatedCost` DECIMAL(10, 2) NULL;
