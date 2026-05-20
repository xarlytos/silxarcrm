-- CreateTable email_senders
CREATE TABLE "email_senders" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "es_default" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "resend_domain_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_senders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_senders_software_id_email_key" ON "email_senders"("software_id", "email");
CREATE INDEX "email_senders_software_id_idx" ON "email_senders"("software_id");
CREATE INDEX "email_senders_activo_idx" ON "email_senders"("activo");

-- CreateTable email_plantillas
CREATE TABLE "email_plantillas" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo_html" TEXT NOT NULL,
    "cuerpo_texto" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_plantillas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_plantillas_software_id_idx" ON "email_plantillas"("software_id");
CREATE INDEX "email_plantillas_activo_idx" ON "email_plantillas"("activo");

-- CreateTable email_campanas
CREATE TABLE "email_campanas" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "plantilla_id" TEXT,
    "asunto_snapshot" TEXT NOT NULL,
    "cuerpo_snapshot" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "total_leads" INTEGER NOT NULL DEFAULT 0,
    "enviados" INTEGER NOT NULL DEFAULT 0,
    "abiertos" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "rebotes" INTEGER NOT NULL DEFAULT 0,
    "bajas" INTEGER NOT NULL DEFAULT 0,
    "filtros" JSONB,
    "programada_para" TIMESTAMP(3),
    "iniciada_en" TIMESTAMP(3),
    "completada_en" TIMESTAMP(3),
    "creado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_campanas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_campanas_software_id_idx" ON "email_campanas"("software_id");
CREATE INDEX "email_campanas_estado_idx" ON "email_campanas"("estado");
CREATE INDEX "email_campanas_created_at_idx" ON "email_campanas"("created_at");

ALTER TABLE "email_campanas" ADD CONSTRAINT "email_campanas_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "email_senders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "email_campanas" ADD CONSTRAINT "email_campanas_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "email_plantillas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable email_envios
CREATE TABLE "email_envios" (
    "id" TEXT NOT NULL,
    "campana_id" TEXT,
    "lead_id" TEXT,
    "sender_id" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo_html" TEXT NOT NULL,
    "resend_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "enviado_en" TIMESTAMP(3),
    "abierto_en" TIMESTAMP(3),
    "ultimo_click_en" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_envios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_envios_campana_id_idx" ON "email_envios"("campana_id");
CREATE INDEX "email_envios_lead_id_idx" ON "email_envios"("lead_id");
CREATE INDEX "email_envios_resend_id_idx" ON "email_envios"("resend_id");
CREATE INDEX "email_envios_estado_idx" ON "email_envios"("estado");
CREATE INDEX "email_envios_destinatario_idx" ON "email_envios"("destinatario");

ALTER TABLE "email_envios" ADD CONSTRAINT "email_envios_campana_id_fkey" FOREIGN KEY ("campana_id") REFERENCES "email_campanas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_envios" ADD CONSTRAINT "email_envios_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "email_senders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable email_eventos
CREATE TABLE "email_eventos" (
    "id" TEXT NOT NULL,
    "envio_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "datos" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_eventos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_eventos_envio_id_idx" ON "email_eventos"("envio_id");
CREATE INDEX "email_eventos_tipo_idx" ON "email_eventos"("tipo");
CREATE INDEX "email_eventos_fecha_idx" ON "email_eventos"("fecha");

ALTER TABLE "email_eventos" ADD CONSTRAINT "email_eventos_envio_id_fkey" FOREIGN KEY ("envio_id") REFERENCES "email_envios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable email_bajas
CREATE TABLE "email_bajas" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "motivo" TEXT,
    "ip_origen" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_bajas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_bajas_email_software_id_key" ON "email_bajas"("email", "software_id");
CREATE INDEX "email_bajas_software_id_idx" ON "email_bajas"("software_id");
