-- CreateTable
CREATE TABLE "clientes_global" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "pais" TEXT,
    "empresa" TEXT,
    "origen_saas" TEXT NOT NULL,
    "cliente_saas_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actualizacion" TIMESTAMP(3) NOT NULL,
    "fecha_ultimo_login" TIMESTAMP(3),
    "metadata" JSONB,
    "notas_internas" TEXT,

    CONSTRAINT "clientes_global_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "saas" TEXT NOT NULL,
    "plan_tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'EUR',
    "monto_proporcional" DECIMAL(10,2),
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "fecha_proximo_pago" TIMESTAMP(3),
    "fecha_ultimo_pago" TIMESTAMP(3),
    "fecha_cancelacion" TIMESTAMP(3),
    "dias_trial_total" INTEGER,
    "dias_trial_restantes" INTEGER,
    "metodo_pago" TEXT,
    "payment_provider_id" TEXT,
    "factura_url" TEXT,
    "motivo_cancelacion" TEXT,
    "cancelacion_initiated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "suscripcion_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'EUR',
    "estado" TEXT NOT NULL,
    "metodo_pago" TEXT,
    "payment_provider_id" TEXT,
    "descripcion" TEXT,
    "fecha_pago" TIMESTAMP(3) NOT NULL,
    "fecha_reembolso" TIMESTAMP(3),
    "numero_factura" TEXT,
    "factura_url" TEXT,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'info',
    "cliente_id" INTEGER,
    "suscripcion_id" INTEGER,
    "saas" TEXT,
    "datos" JSONB,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "notificado_push" BOOLEAN NOT NULL DEFAULT false,
    "notificado_dashboard" BOOLEAN NOT NULL DEFAULT false,
    "ip_origen" TEXT,
    "user_agent" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_diarias" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "saas" TEXT NOT NULL,
    "nuevos_registros" INTEGER NOT NULL DEFAULT 0,
    "nuevos_pagos" INTEGER NOT NULL DEFAULT 0,
    "cancelaciones" INTEGER NOT NULL DEFAULT 0,
    "upgrades" INTEGER NOT NULL DEFAULT 0,
    "downgrades" INTEGER NOT NULL DEFAULT 0,
    "clientes_activos" INTEGER NOT NULL DEFAULT 0,
    "trials_activos" INTEGER NOT NULL DEFAULT 0,
    "trials_convertidos" INTEGER NOT NULL DEFAULT 0,
    "trials_expirados" INTEGER NOT NULL DEFAULT 0,
    "mrr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "arr" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ingresos_nuevos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ingresos_perdidos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "logins_totales" INTEGER NOT NULL DEFAULT 0,
    "feature_mas_usada" TEXT,
    "churn_rate" DECIMAL(5,2),
    "conversion_rate" DECIMAL(5,2),
    "trial_to_paid_rate" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metricas_diarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks_config" (
    "id" SERIAL NOT NULL,
    "saas" TEXT NOT NULL,
    "webhook_secret" TEXT NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "reintentos_maximos" INTEGER NOT NULL DEFAULT 3,
    "timeout_ms" INTEGER NOT NULL DEFAULT 5000,
    "ultimo_error" TEXT,
    "ultimo_error_at" TIMESTAMP(3),
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_crm" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'admin',
    "fcm_token" TEXT,
    "notificaciones_activas" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "ultimo_login_ip" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_crm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones_ia" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "mensaje_usuario" TEXT NOT NULL,
    "respuesta_ia" TEXT NOT NULL,
    "sql_generado" TEXT,
    "datos_consulta" JSONB,
    "tiempo_respuesta_ms" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversaciones_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_global_email_key" ON "clientes_global"("email");

-- CreateIndex
CREATE INDEX "clientes_global_origen_saas_idx" ON "clientes_global"("origen_saas");

-- CreateIndex
CREATE INDEX "clientes_global_estado_idx" ON "clientes_global"("estado");

-- CreateIndex
CREATE INDEX "clientes_global_fecha_registro_idx" ON "clientes_global"("fecha_registro");

-- CreateIndex
CREATE INDEX "suscripciones_cliente_id_idx" ON "suscripciones"("cliente_id");

-- CreateIndex
CREATE INDEX "suscripciones_saas_idx" ON "suscripciones"("saas");

-- CreateIndex
CREATE INDEX "suscripciones_estado_idx" ON "suscripciones"("estado");

-- CreateIndex
CREATE INDEX "suscripciones_fecha_proximo_pago_idx" ON "suscripciones"("fecha_proximo_pago");

-- CreateIndex
CREATE INDEX "suscripciones_plan_tipo_estado_idx" ON "suscripciones"("plan_tipo", "estado");

-- CreateIndex
CREATE INDEX "pagos_suscripcion_id_idx" ON "pagos"("suscripcion_id");

-- CreateIndex
CREATE INDEX "pagos_fecha_pago_idx" ON "pagos"("fecha_pago");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- CreateIndex
CREATE INDEX "eventos_tipo_idx" ON "eventos"("tipo");

-- CreateIndex
CREATE INDEX "eventos_saas_idx" ON "eventos"("saas");

-- CreateIndex
CREATE INDEX "eventos_fecha_idx" ON "eventos"("fecha");

-- CreateIndex
CREATE INDEX "eventos_procesado_idx" ON "eventos"("procesado");

-- CreateIndex
CREATE INDEX "eventos_notificado_push_idx" ON "eventos"("notificado_push");

-- CreateIndex
CREATE INDEX "eventos_cliente_id_fecha_idx" ON "eventos"("cliente_id", "fecha");

-- CreateIndex
CREATE INDEX "metricas_diarias_fecha_idx" ON "metricas_diarias"("fecha");

-- CreateIndex
CREATE INDEX "metricas_diarias_saas_idx" ON "metricas_diarias"("saas");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_diarias_fecha_saas_key" ON "metricas_diarias"("fecha", "saas");

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_config_saas_key" ON "webhooks_config"("saas");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_crm_email_key" ON "usuarios_crm"("email");

-- CreateIndex
CREATE INDEX "conversaciones_ia_usuario_id_idx" ON "conversaciones_ia"("usuario_id");

-- CreateIndex
CREATE INDEX "conversaciones_ia_fecha_idx" ON "conversaciones_ia"("fecha");

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_global"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_global"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes_global"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones_ia" ADD CONSTRAINT "conversaciones_ia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios_crm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
