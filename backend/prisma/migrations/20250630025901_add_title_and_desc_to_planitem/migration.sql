/*
  Warnings:

  - You are about to alter the column `latitude` on the `planitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,8)`.
  - Added the required column `title` to the `PlanItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `planitem` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `title` VARCHAR(191) NOT NULL,
    MODIFY `latitude` DECIMAL(10, 8) NOT NULL;
