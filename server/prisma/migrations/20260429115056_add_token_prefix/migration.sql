-- Delete existing tokens (they have no prefix, will be re-created on next login)
DELETE FROM "refresh_tokens";

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "tokenPrefix" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenPrefix_idx" ON "refresh_tokens"("tokenPrefix");
