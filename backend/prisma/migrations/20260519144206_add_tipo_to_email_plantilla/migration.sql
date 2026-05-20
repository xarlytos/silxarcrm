-- AlterTable
ALTER TABLE "email_plantillas" ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'custom';

-- CreateIndex
CREATE INDEX "email_plantillas_tipo_idx" ON "email_plantillas"("tipo");
