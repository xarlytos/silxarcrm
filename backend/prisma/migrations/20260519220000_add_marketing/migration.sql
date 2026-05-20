-- CreateEnum
CREATE TYPE "LandingEstado" AS ENUM ('BORRADOR', 'PUBLICADA', 'PAUSADA');

-- CreateEnum
CREATE TYPE "FreeValueEstado" AS ENUM ('BORRADOR', 'PUBLICADO', 'PAUSADO');

-- CreateTable landings
CREATE TABLE "landings" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "LandingEstado" NOT NULL DEFAULT 'BORRADOR',
    "visitas" INTEGER NOT NULL DEFAULT 0,
    "conversiones" INTEGER NOT NULL DEFAULT 0,
    "leads_generados" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "landings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "landings_slug_software_id_key" ON "landings"("slug", "software_id");
CREATE INDEX "landings_software_id_idx" ON "landings"("software_id");
CREATE INDEX "landings_estado_idx" ON "landings"("estado");
CREATE INDEX "landings_created_at_idx" ON "landings"("created_at");

-- CreateTable free_values
CREATE TABLE "free_values" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "FreeValueEstado" NOT NULL DEFAULT 'BORRADOR',
    "usos" INTEGER NOT NULL DEFAULT 0,
    "leads_generados" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "free_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "free_values_slug_software_id_key" ON "free_values"("slug", "software_id");
CREATE INDEX "free_values_software_id_idx" ON "free_values"("software_id");
CREATE INDEX "free_values_tipo_idx" ON "free_values"("tipo");
CREATE INDEX "free_values_estado_idx" ON "free_values"("estado");
CREATE INDEX "free_values_created_at_idx" ON "free_values"("created_at");
