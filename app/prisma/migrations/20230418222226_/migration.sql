/*
  Warnings:

  - The values [PAID_FOR,DRIVER_PAID] on the enum `deliveryOrder_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `deliveryorder` MODIFY `status` ENUM('CREATED', 'ASSIGNED', 'ACCEPTED', 'PICKEDUP', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'CREATED';
