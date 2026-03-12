/*
  Warnings:

  - You are about to drop the column `galleryDataLimitMB` on the `SubscriptionPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "initiatedBy" TEXT NOT NULL DEFAULT 'vendor';

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "galleryDataLimitMB",
ADD COLUMN     "galleryLimit" INTEGER NOT NULL DEFAULT 50;
