/*
  Warnings:

  - You are about to alter the column `status` on the `deliveryorder` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `deliveryorder` MODIFY `actualDeliveryCost` DECIMAL(15, 2) NULL,
    MODIFY `status` ENUM('ASSIGNED', 'PICKEDUP', 'DELIVERED') NOT NULL DEFAULT 'ASSIGNED';
