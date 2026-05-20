-- Renombrado del identificador de SaaS: 'fitsuite' -> 'atleevo'
-- Actualiza todas las tablas que almacenan el identificador en
-- columnas `saas`, `origen_saas` o `software_id`.
-- Nota: NO se modifica `webhook_secret` para no romper integraciones existentes.

BEGIN;

-- WebhookConfig: identificador + endpoint + descripcion
UPDATE "webhooks_config"
SET
  "saas" = 'atleevo',
  "endpoint_url" = '/webhooks/atleevo',
  "descripcion" = 'Atleevo - Software para Entrenadores Personales',
  "updated_at" = NOW()
WHERE "saas" = 'fitsuite';

-- ClienteGlobal.origen_saas
UPDATE "clientes_global" SET "origen_saas" = 'atleevo' WHERE "origen_saas" = 'fitsuite';

-- Suscripciones / eventos / metricas / crm_clients
UPDATE "suscripciones"     SET "saas" = 'atleevo' WHERE "saas" = 'fitsuite';
UPDATE "eventos"           SET "saas" = 'atleevo' WHERE "saas" = 'fitsuite';
UPDATE "metricas_diarias"  SET "saas" = 'atleevo' WHERE "saas" = 'fitsuite';
UPDATE "crm_clients"       SET "saas" = 'atleevo' WHERE "saas" = 'fitsuite';

-- Tablas con software_id
UPDATE "leads"                SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "whatsapp_plantillas"  SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "whatsapp_ab_tests"    SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "spechs_llamada"       SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "sesiones_prueba_ia"   SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "llamadas_reales"      SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "email_accounts"       SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "email_senders"        SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "email_plantillas"     SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "email_campanas"       SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "email_bajas"          SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "landings"             SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "free_values"          SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';
UPDATE "propuestas"           SET "software_id" = 'atleevo' WHERE "software_id" = 'fitsuite';

COMMIT;
