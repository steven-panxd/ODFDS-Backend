/*
  Warnings:

  - You are about to drop the column `actualDeliveryCost` on the `deliveryorder` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDeliveryCost` on the `deliveryorder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `deliveryorder` DROP COLUMN `actualDeliveryCost`,
    DROP COLUMN `estimatedDeliveryCost`,
    ADD COLUMN `cost` DECIMAL(15, 2) NULL;
