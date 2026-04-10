-- CreateTable
CREATE TABLE "calendario_eventos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "todo_el_dia" BOOLEAN NOT NULL DEFAULT false,
    "asignado_a" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "creado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendario_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendario_eventos_fecha_inicio_idx" ON "calendario_eventos"("fecha_inicio");

-- CreateIndex
CREATE INDEX "calendario_eventos_asignado_a_idx" ON "calendario_eventos"("asignado_a");

-- CreateIndex
CREATE INDEX "calendario_eventos_completado_idx" ON "calendario_eventos"("completado");
