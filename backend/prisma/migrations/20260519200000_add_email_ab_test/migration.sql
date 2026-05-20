-- A/B Test fields on email_campanas
ALTER TABLE "email_campanas" ADD COLUMN "es_ab_test" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_campanas" ADD COLUMN "ganadora_promovida_en" TIMESTAMP(3);

-- New table: email_variantes
CREATE TABLE "email_variantes" (
    "id" TEXT NOT NULL,
    "campana_id" TEXT NOT NULL,
    "letra" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo_html" TEXT NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "es_ganadora" BOOLEAN NOT NULL DEFAULT false,
    "enviados" INTEGER NOT NULL DEFAULT 0,
    "abiertos" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "rebotes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_variantes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_variantes_campana_id_letra_key" ON "email_variantes"("campana_id", "letra");
CREATE INDEX "email_variantes_campana_id_idx" ON "email_variantes"("campana_id");

ALTER TABLE "email_variantes" ADD CONSTRAINT "email_variantes_campana_id_fkey"
  FOREIGN KEY ("campana_id") REFERENCES "email_campanas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add variante_id and reservado to email_envios
ALTER TABLE "email_envios" ADD COLUMN "variante_id" TEXT;
ALTER TABLE "email_envios" ADD COLUMN "reservado" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "email_envios_variante_id_idx" ON "email_envios"("variante_id");

ALTER TABLE "email_envios" ADD CONSTRAINT "email_envios_variante_id_fkey"
  FOREIGN KEY ("variante_id") REFERENCES "email_variantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
