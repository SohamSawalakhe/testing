-- DropIndex
DROP INDEX "VendorRegistration_userId_key";

-- AlterTable
ALTER TABLE "VendorRegistration" ALTER COLUMN "userId" DROP NOT NULL;
