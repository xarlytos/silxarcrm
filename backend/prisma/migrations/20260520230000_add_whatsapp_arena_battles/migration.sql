-- CreateTable whatsapp_arena_battles
CREATE TABLE "whatsapp_arena_battles" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "plantilla_a_id" TEXT NOT NULL,
    "plantilla_b_id" TEXT NOT NULL,
    "perfiles" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "ganador_global" TEXT NOT NULL,
    "nota" TEXT,
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_arena_battles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_arena_battles_software_id_idx" ON "whatsapp_arena_battles"("software_id");
CREATE INDEX "whatsapp_arena_battles_created_at_idx" ON "whatsapp_arena_battles"("created_at");

ALTER TABLE "whatsapp_arena_battles" ADD CONSTRAINT "whatsapp_arena_battles_plantilla_a_id_fkey"
  FOREIGN KEY ("plantilla_a_id") REFERENCES "whatsapp_plantillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_arena_battles" ADD CONSTRAINT "whatsapp_arena_battles_plantilla_b_id_fkey"
  FOREIGN KEY ("plantilla_b_id") REFERENCES "whatsapp_plantillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
