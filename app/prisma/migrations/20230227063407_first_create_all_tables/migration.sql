/*
  Warnings:

  - You are about to drop the column `name` on the `driver` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `driver` table. All the data in the column will be lost.
  - Added the required column `driverLicenseImage` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driverLicenseNumber` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `Driver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `driver` DROP COLUMN `name`,
    DROP COLUMN `verified`,
    ADD COLUMN `driverLicenseImage` VARCHAR(191) NOT NULL,
    ADD COLUMN `driverLicenseNumber` VARCHAR(191) NOT NULL,
    ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `verification` ENUM('NOTVERIFIED', 'VERIFIED', 'NOTPASSED') NOT NULL DEFAULT 'NOTVERIFIED';

-- CreateTable
CREATE TABLE `Restaurant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `verification` ENUM('NOTVERIFIED', 'VERIFIED', 'NOTPASSED') NOT NULL DEFAULT 'NOTVERIFIED',
    `street` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `zipCode` VARCHAR(191) NOT NULL,
    `latitude` DECIMAL(16, 12) NOT NULL,
    `longtitude` DECIMAL(16, 12) NOT NULL,

    UNIQUE INDEX `Restaurant_email_key`(`email`),
    UNIQUE INDEX `Restaurant_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditCard` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cardNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `street` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `zipCode` VARCHAR(191) NOT NULL,
    `cvv` VARCHAR(191) NOT NULL,
    `cardType` ENUM('VISA', 'MASTERCARD', 'DISCOVER', 'AMEX') NOT NULL,
    `restaurantId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('PENDING', 'POSTED', 'PAYING', 'PAID', 'REFUNDING', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `payerId` INTEGER NOT NULL,
    `payeeId` INTEGER NOT NULL,
    `cardId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliveryOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estimatedDeliveryTime` DATETIME(3) NOT NULL,
    `estimatedDeliveryCost` DECIMAL(15, 2) NOT NULL,
    `actualDeliveryTime` DATETIME(3) NULL,
    `actualDeliveryCost` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('CREATED', 'ASSIGNED', 'PICKEDUP', 'DELIVERED') NOT NULL DEFAULT 'CREATED',
    `customerStreet` VARCHAR(191) NOT NULL,
    `customerState` VARCHAR(191) NOT NULL,
    `customerZipCode` VARCHAR(191) NOT NULL,
    `customerLatitude` DECIMAL(16, 12) NOT NULL,
    `customerLongtitude` DECIMAL(16, 12) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `restaurantId` INTEGER NOT NULL,
    `driverId` INTEGER NULL,
    `transactionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreditCard` ADD CONSTRAINT `CreditCard_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTransaction` ADD CONSTRAINT `PaymentTransaction_payerId_fkey` FOREIGN KEY (`payerId`) REFERENCES `Restaurant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTransaction` ADD CONSTRAINT `PaymentTransaction_payeeId_fkey` FOREIGN KEY (`payeeId`) REFERENCES `Driver`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTransaction` ADD CONSTRAINT `PaymentTransaction_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `CreditCard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryOrder` ADD CONSTRAINT `deliveryOrder_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `Restaurant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryOrder` ADD CONSTRAINT `deliveryOrder_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveryOrder` ADD CONSTRAINT `deliveryOrder_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `PaymentTransaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
