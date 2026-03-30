-- AlterTable
ALTER TABLE `PurchaseOrder` ADD COLUMN `title` VARCHAR(255) NULL,
    ADD COLUMN `expectedDeliveryDate` DATETIME(3) NULL,
    ADD COLUMN `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `PurchaseOrderItem` ADD COLUMN `volumePerCartonM3` DOUBLE NULL,
    ADD COLUMN `volumeAllCartonM3` DOUBLE NULL;
