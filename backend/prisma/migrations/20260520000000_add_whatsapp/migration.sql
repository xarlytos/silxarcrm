-- CreateTable whatsapp_plantillas
CREATE TABLE "whatsapp_plantillas" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'general',
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_plantillas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_plantillas_software_id_idx" ON "whatsapp_plantillas"("software_id");
CREATE INDEX "whatsapp_plantillas_categoria_idx" ON "whatsapp_plantillas"("categoria");
CREATE INDEX "whatsapp_plantillas_activa_idx" ON "whatsapp_plantillas"("activa");

-- CreateTable whatsapp_envios
CREATE TABLE "whatsapp_envios" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "plantilla_id" TEXT,
    "telefono" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "usuario_id" INTEGER,
    "enviado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_envios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_envios_lead_id_idx" ON "whatsapp_envios"("lead_id");
CREATE INDEX "whatsapp_envios_plantilla_id_idx" ON "whatsapp_envios"("plantilla_id");
CREATE INDEX "whatsapp_envios_enviado_at_idx" ON "whatsapp_envios"("enviado_at");

-- Foreign Keys
ALTER TABLE "whatsapp_envios" ADD CONSTRAINT "whatsapp_envios_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_envios" ADD CONSTRAINT "whatsapp_envios_plantilla_id_fkey"
  FOREIGN KEY ("plantilla_id") REFERENCES "whatsapp_plantillas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
