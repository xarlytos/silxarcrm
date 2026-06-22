-- CreateTable deal_activities
CREATE TABLE "deal_activities" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "transcript" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_activities_deal_id_idx" ON "deal_activities"("deal_id");

-- CreateIndex
CREATE INDEX "deal_activities_tipo_idx" ON "deal_activities"("tipo");

-- CreateIndex
CREATE INDEX "deal_activities_created_at_idx" ON "deal_activities"("created_at");

-- CreateIndex
CREATE INDEX "deal_activities_deal_id_created_at_idx" ON "deal_activities"("deal_id", "created_at");
