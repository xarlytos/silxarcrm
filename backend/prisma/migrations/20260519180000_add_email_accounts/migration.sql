-- CreateTable email_accounts
CREATE TABLE "email_accounts" (
    "id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL DEFAULT 'resend',
    "nombre" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "cuota_max" INTEGER,
    "cuota_usada" INTEGER NOT NULL DEFAULT 0,
    "cuota_reset_en" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_accounts_software_id_nombre_key" ON "email_accounts"("software_id", "nombre");
CREATE INDEX "email_accounts_software_id_idx" ON "email_accounts"("software_id");
CREATE INDEX "email_accounts_activo_idx" ON "email_accounts"("activo");

-- Add account_id to email_senders
ALTER TABLE "email_senders" ADD COLUMN "account_id" TEXT;
CREATE INDEX "email_senders_account_id_idx" ON "email_senders"("account_id");

ALTER TABLE "email_senders" ADD CONSTRAINT "email_senders_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
