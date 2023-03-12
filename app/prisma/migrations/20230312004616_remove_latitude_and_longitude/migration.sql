/*
  Warnings:

  - You are about to drop the column `customerLatitude` on the `deliveryorder` table. All the data in the column will be lost.
  - You are about to drop the column `customerLongtitude` on the `deliveryorder` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `longtitude` on the `restaurant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `deliveryorder` DROP COLUMN `customerLatitude`,
    DROP COLUMN `customerLongtitude`;

-- AlterTable
ALTER TABLE `restaurant` DROP COLUMN `latitude`,
    DROP COLUMN `longtitude`;
