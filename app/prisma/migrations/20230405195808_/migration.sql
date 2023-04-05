/*
  Warnings:

  - You are about to drop the column `bankAccountNumber` on the `driver` table. All the data in the column will be lost.
  - You are about to drop the column `bankRoutingNumber` on the `driver` table. All the data in the column will be lost.
  - Added the required column `stripeAccountId` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeCustomerId` to the `Restaurant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `driver` DROP COLUMN `bankAccountNumber`,
    DROP COLUMN `bankRoutingNumber`,
    ADD COLUMN `stripeAccountId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `restaurant` ADD COLUMN `stripeCustomerId` VARCHAR(191) NOT NULL;
