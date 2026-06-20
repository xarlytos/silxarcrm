-- AlterTable
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "portal_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "portal_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "brands_portal_token_key" ON "brands"("portal_token");
