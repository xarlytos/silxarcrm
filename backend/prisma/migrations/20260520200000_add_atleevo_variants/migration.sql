-- Alta de 3 SaaS adicionales de la familia Atleevo:
--   atleevogym  - Software para Gimnasios
--   atleevoyoga - Software para Estudios de Yoga
--   atleevobox  - Software para Boxes de CrossFit
-- Idempotente: ON CONFLICT DO NOTHING sobre la unique key `saas`.

INSERT INTO "webhooks_config" ("saas", "webhook_secret", "endpoint_url", "descripcion", "updated_at")
VALUES
  ('atleevogym',  'whsec_atleevogym_secret_key_2024',  '/webhooks/atleevogym',  'Atleevo Gym - Software para Gimnasios',         NOW()),
  ('atleevoyoga', 'whsec_atleevoyoga_secret_key_2024', '/webhooks/atleevoyoga', 'Atleevo Yoga - Software para Estudios de Yoga', NOW()),
  ('atleevobox',  'whsec_atleevobox_secret_key_2024',  '/webhooks/atleevobox',  'Atleevo Box - Software para Boxes de CrossFit', NOW())
ON CONFLICT ("saas") DO NOTHING;
