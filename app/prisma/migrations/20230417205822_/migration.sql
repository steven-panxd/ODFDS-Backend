/*
  Warnings:

  - Added the required column `stripePaymentIntentId` to the `deliveryOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeTransferId` to the `deliveryOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `deliveryorder` ADD COLUMN `stripePaymentIntentId` VARCHAR(191) NOT NULL,
    ADD COLUMN `stripeTransferId` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('CREATED', 'PAID_FOR', 'ASSIGNED', 'ACCEPTED', 'PICKEDUP', 'DELIVERED', 'DRIVER_PAID', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    MODIFY `comment` VARCHAR(191) NULL;
