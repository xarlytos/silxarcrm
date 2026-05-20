-- CreateEnum
CREATE TYPE "LeadEstado" AS ENUM ('NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_SEGUIMIENTO', 'CALIFICADO', 'RECHAZADO', 'NO_RESPONDE', 'CONVERTIDO');

-- CreateEnum
CREATE TYPE "PrioridadLead" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "empresa" TEXT,
    "cargo" TEXT,
    "pais" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "software_id" TEXT NOT NULL,
    "estado" "LeadEstado" NOT NULL DEFAULT 'NUEVO',
    "prioridad" "PrioridadLead" NOT NULL DEFAULT 'MEDIA',
    "notas" TEXT,
    "ultimo_contacto" TIMESTAMP(3),
    "asignado_a" INTEGER,
    "convertido_a" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_historial" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_etiquetas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',

    CONSTRAINT "lead_etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LeadToLeadEtiqueta" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "leads_estado_idx" ON "leads"("estado");

-- CreateIndex
CREATE INDEX "leads_prioridad_idx" ON "leads"("prioridad");

-- CreateIndex
CREATE INDEX "leads_software_id_idx" ON "leads"("software_id");

-- CreateIndex
CREATE INDEX "leads_asignado_a_idx" ON "leads"("asignado_a");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_software_id_key" ON "leads"("email", "software_id");

-- CreateIndex
CREATE INDEX "lead_historial_lead_id_idx" ON "lead_historial"("lead_id");

-- CreateIndex
CREATE INDEX "lead_historial_created_at_idx" ON "lead_historial"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "lead_etiquetas_nombre_key" ON "lead_etiquetas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "_LeadToLeadEtiqueta_AB_unique" ON "_LeadToLeadEtiqueta"("A", "B");

-- CreateIndex
CREATE INDEX "_LeadToLeadEtiqueta_B_index" ON "_LeadToLeadEtiqueta"("B");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_asignado_a_fkey" FOREIGN KEY ("asignado_a") REFERENCES "usuarios_crm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_historial" ADD CONSTRAINT "lead_historial_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadToLeadEtiqueta" ADD CONSTRAINT "_LeadToLeadEtiqueta_A_fkey" FOREIGN KEY ("A") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeadToLeadEtiqueta" ADD CONSTRAINT "_LeadToLeadEtiqueta_B_fkey" FOREIGN KEY ("B") REFERENCES "lead_etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
