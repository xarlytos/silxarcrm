-- CreateTable
CREATE TABLE "radar_configs" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sector" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ciudades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pais" TEXT NOT NULL DEFAULT 'España',
    "solo_sin_web" BOOLEAN NOT NULL DEFAULT false,
    "rating_max" DOUBLE PRECISION,
    "rating_min" DOUBLE PRECISION,
    "min_resenas" INTEGER,
    "max_resenas" INTEGER,
    "excluir_cerrados" BOOLEAN NOT NULL DEFAULT true,
    "max_leads_por_run" INTEGER NOT NULL DEFAULT 40,
    "auto_secuencia" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radar_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radar_runs" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "scanned" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "radar_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "radar_configs_software_id_key" ON "radar_configs"("software_id");

-- CreateIndex
CREATE INDEX "radar_configs_software_id_idx" ON "radar_configs"("software_id");

-- CreateIndex
CREATE INDEX "radar_runs_software_id_idx" ON "radar_runs"("software_id");

-- CreateIndex
CREATE INDEX "radar_runs_config_id_idx" ON "radar_runs"("config_id");

-- CreateIndex
CREATE INDEX "radar_runs_started_at_idx" ON "radar_runs"("started_at");

-- AddForeignKey
ALTER TABLE "radar_configs" ADD CONSTRAINT "radar_configs_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "softwares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radar_runs" ADD CONSTRAINT "radar_runs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "radar_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radar_runs" ADD CONSTRAINT "radar_runs_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "softwares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
