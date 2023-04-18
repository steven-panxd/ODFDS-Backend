-- AlterTable
ALTER TABLE `deliveryorder` MODIFY `stripePaymentIntentId` VARCHAR(191) NULL,
    MODIFY `stripeTransferId` VARCHAR(191) NULL;
