-- CreateTable
CREATE TABLE "auditorias" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "negocio" TEXT NOT NULL,
    "url" TEXT,
    "nombre" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "score" INTEGER,
    "resultado" JSONB,
    "error" TEXT,
    "lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditorias_software_id_idx" ON "auditorias"("software_id");

-- CreateIndex
CREATE INDEX "auditorias_created_at_idx" ON "auditorias"("created_at");

-- CreateIndex
CREATE INDEX "auditorias_status_idx" ON "auditorias"("status");

-- AddForeignKey
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "softwares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
