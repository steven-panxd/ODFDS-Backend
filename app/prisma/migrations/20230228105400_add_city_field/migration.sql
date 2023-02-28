/*
  Warnings:

  - Added the required column `city` to the `CreditCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerCity` to the `deliveryOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Restaurant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `creditcard` ADD COLUMN `city` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `deliveryorder` ADD COLUMN `customerCity` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `restaurant` ADD COLUMN `city` VARCHAR(191) NOT NULL;
