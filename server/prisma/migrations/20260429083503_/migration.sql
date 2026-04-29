-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "governmentIdUrl" TEXT,
ADD COLUMN     "governmentIdVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socialLink" TEXT;
