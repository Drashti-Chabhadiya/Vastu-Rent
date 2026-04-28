-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "listingId" TEXT;

-- AlterTable
ALTER TABLE "listings" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
