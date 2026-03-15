/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber]` on the table `VendorPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "VendorPayment" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "invoiceDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "planDuration" INTEGER,
ADD COLUMN     "planName" TEXT,
ADD COLUMN     "taxAmount" DOUBLE PRECISION DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayment_invoiceNumber_key" ON "VendorPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "VendorPayment_invoiceNumber_idx" ON "VendorPayment"("invoiceNumber");
