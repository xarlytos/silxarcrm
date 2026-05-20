-- CreateTable whatsapp_conversaciones
CREATE TABLE "whatsapp_conversaciones" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "no_leidos" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_conversaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_conversaciones_lead_id_key" ON "whatsapp_conversaciones"("lead_id");
CREATE INDEX "whatsapp_conversaciones_software_id_idx" ON "whatsapp_conversaciones"("software_id");
CREATE INDEX "whatsapp_conversaciones_ultima_actividad_idx" ON "whatsapp_conversaciones"("ultima_actividad");

-- CreateTable whatsapp_mensajes
CREATE TABLE "whatsapp_mensajes" (
    "id" TEXT NOT NULL,
    "conversacion_id" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "ia_generado" BOOLEAN NOT NULL DEFAULT false,
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_mensajes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_mensajes_conversacion_id_created_at_idx" ON "whatsapp_mensajes"("conversacion_id", "created_at");

-- Foreign Keys
ALTER TABLE "whatsapp_conversaciones" ADD CONSTRAINT "whatsapp_conversaciones_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_mensajes" ADD CONSTRAINT "whatsapp_mensajes_conversacion_id_fkey"
  FOREIGN KEY ("conversacion_id") REFERENCES "whatsapp_conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
