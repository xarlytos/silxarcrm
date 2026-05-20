-- CreateTable
CREATE TABLE "spechs_llamada" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL DEFAULT 'Cierre',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spechs_llamada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_prueba_ia" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "spech_id" TEXT,
    "usuario_id" INTEGER,
    "lead_simulado" JSONB NOT NULL,
    "mensajes" JSONB NOT NULL DEFAULT '[]',
    "resultado" TEXT,
    "feedback" JSONB,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesiones_prueba_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llamadas_reales" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "spech_id" TEXT,
    "agente_id" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'iniciando',
    "direccion" TEXT NOT NULL DEFAULT 'saliente',
    "telefono_lead" TEXT NOT NULL,
    "telefono_agente" TEXT,
    "duracion_seg" INTEGER,
    "grabacion_url" TEXT,
    "notas_post" TEXT,
    "lead_estado_prev" TEXT,
    "lead_estado_post" TEXT,
    "transcript" TEXT,
    "calificacion" INTEGER,
    "proxima_accion" TEXT,
    "zadarma_call_id" TEXT,
    "metadata" JSONB,
    "iniciada_at" TIMESTAMP(3),
    "terminada_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llamadas_reales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spechs_llamada_software_id_idx" ON "spechs_llamada"("software_id");

-- CreateIndex
CREATE INDEX "spechs_llamada_activo_idx" ON "spechs_llamada"("activo");

-- CreateIndex
CREATE INDEX "sesiones_prueba_ia_software_id_idx" ON "sesiones_prueba_ia"("software_id");

-- CreateIndex
CREATE INDEX "sesiones_prueba_ia_usuario_id_idx" ON "sesiones_prueba_ia"("usuario_id");

-- CreateIndex
CREATE INDEX "sesiones_prueba_ia_created_at_idx" ON "sesiones_prueba_ia"("created_at");

-- CreateIndex
CREATE INDEX "llamadas_reales_software_id_idx" ON "llamadas_reales"("software_id");

-- CreateIndex
CREATE INDEX "llamadas_reales_lead_id_idx" ON "llamadas_reales"("lead_id");

-- CreateIndex
CREATE INDEX "llamadas_reales_agente_id_idx" ON "llamadas_reales"("agente_id");

-- CreateIndex
CREATE INDEX "llamadas_reales_estado_idx" ON "llamadas_reales"("estado");

-- CreateIndex
CREATE INDEX "llamadas_reales_created_at_idx" ON "llamadas_reales"("created_at");

-- CreateIndex
CREATE INDEX "llamadas_reales_zadarma_call_id_idx" ON "llamadas_reales"("zadarma_call_id");

-- AddForeignKey
ALTER TABLE "sesiones_prueba_ia" ADD CONSTRAINT "sesiones_prueba_ia_spech_id_fkey" FOREIGN KEY ("spech_id") REFERENCES "spechs_llamada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamadas_reales" ADD CONSTRAINT "llamadas_reales_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamadas_reales" ADD CONSTRAINT "llamadas_reales_spech_id_fkey" FOREIGN KEY ("spech_id") REFERENCES "spechs_llamada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamadas_reales" ADD CONSTRAINT "llamadas_reales_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "usuarios_crm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
