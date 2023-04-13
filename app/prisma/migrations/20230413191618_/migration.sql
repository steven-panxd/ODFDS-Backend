/*
  Warnings:

  - You are about to drop the column `transactionId` on the `deliveryorder` table. All the data in the column will be lost.
  - You are about to drop the `creditcard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `paymenttransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `creditcard` DROP FOREIGN KEY `CreditCard_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `deliveryorder` DROP FOREIGN KEY `deliveryOrder_transactionId_fkey`;

-- DropForeignKey
ALTER TABLE `paymenttransaction` DROP FOREIGN KEY `PaymentTransaction_cardId_fkey`;

-- DropForeignKey
ALTER TABLE `paymenttransaction` DROP FOREIGN KEY `PaymentTransaction_payeeId_fkey`;

-- DropForeignKey
ALTER TABLE `paymenttransaction` DROP FOREIGN KEY `PaymentTransaction_payerId_fkey`;

-- AlterTable
ALTER TABLE `deliveryorder` DROP COLUMN `transactionId`;

-- DropTable
DROP TABLE `creditcard`;

-- DropTable
DROP TABLE `paymenttransaction`;
