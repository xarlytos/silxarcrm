-- CreateTable
CREATE TABLE "crm_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "saas" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "crm_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "nombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_uso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_events" (
    "id" TEXT NOT NULL,
    "crm_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_id" TEXT,
    "user_id" TEXT,
    "email" TEXT,
    "session_id" TEXT,
    "datos" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "recibido_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_origen" TEXT,
    "user_agent" TEXT,
    "procesado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tracked_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_clients_saas_idx" ON "crm_clients"("saas");

-- CreateIndex
CREATE INDEX "crm_clients_activo_idx" ON "crm_clients"("activo");

-- CreateIndex
CREATE INDEX "api_keys_crm_id_idx" ON "api_keys"("crm_id");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "tracked_events_crm_id_idx" ON "tracked_events"("crm_id");

-- CreateIndex
CREATE INDEX "tracked_events_event_name_idx" ON "tracked_events"("event_name");

-- CreateIndex
CREATE INDEX "tracked_events_timestamp_idx" ON "tracked_events"("timestamp");

-- CreateIndex
CREATE INDEX "tracked_events_event_id_idx" ON "tracked_events"("event_id");

-- CreateIndex
CREATE INDEX "tracked_events_user_id_idx" ON "tracked_events"("user_id");

-- CreateIndex
CREATE INDEX "tracked_events_procesado_idx" ON "tracked_events"("procesado");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_crm_id_fkey" FOREIGN KEY ("crm_id") REFERENCES "crm_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_events" ADD CONSTRAINT "tracked_events_crm_id_fkey" FOREIGN KEY ("crm_id") REFERENCES "crm_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
