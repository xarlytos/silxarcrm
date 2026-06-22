-- Migration: Add field-level encryption (AES-256-GCM) for PII in Lead, ClienteGlobal, and ContactoProspecto models
-- Date: 2024-06-22
-- Purpose: Implement GDPR/CCPA-compliant encryption for personally identifiable information

-- ============================================================
-- Step 1: Add encrypted fields to clientes_global table
-- ============================================================

ALTER TABLE clientes_global ADD COLUMN IF NOT EXISTS encrypted_nombre VARCHAR;
ALTER TABLE clientes_global ADD COLUMN IF NOT EXISTS encrypted_email VARCHAR;
ALTER TABLE clientes_global ADD COLUMN IF NOT EXISTS encrypted_telefono VARCHAR;
ALTER TABLE clientes_global ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR DEFAULT 'default-2024-01';
ALTER TABLE clientes_global ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP;

-- Create partial index for encrypted records (optimization)
CREATE INDEX IF NOT EXISTS idx_clientes_global_encrypted_at ON clientes_global(encrypted_at) WHERE encrypted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_global_encryption_key_id ON clientes_global(encryption_key_id);

-- ============================================================
-- Step 2: Add encrypted fields to leads table
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS encrypted_nombre VARCHAR;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS encrypted_email VARCHAR;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS encrypted_telefono VARCHAR;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR DEFAULT 'default-2024-01';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP;

-- Create partial index for encrypted records (optimization)
CREATE INDEX IF NOT EXISTS idx_leads_encrypted_at ON leads(encrypted_at) WHERE encrypted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_encryption_key_id ON leads(encryption_key_id);

-- ============================================================
-- Step 3: Create contactos_prospecto table
-- ============================================================

CREATE TABLE IF NOT EXISTS contactos_prospecto (
  id VARCHAR(25) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  empresa VARCHAR(255),
  cargo VARCHAR(255),
  ciudad VARCHAR(255),
  pais VARCHAR(100),
  software_id VARCHAR(25) NOT NULL,
  fuente VARCHAR(50) DEFAULT 'radar',
  estado VARCHAR(50) DEFAULT 'nuevo',
  lead_id VARCHAR(25),
  notas TEXT,

  -- Encrypted PII fields (AES-256-GCM)
  encrypted_nombre VARCHAR,
  encrypted_email VARCHAR,
  encrypted_telefono VARCHAR,
  encryption_key_id VARCHAR DEFAULT 'default-2024-01',
  encrypted_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uk_contactos_prospecto_email_software UNIQUE(email, software_id)
);

-- Indexes for contactos_prospecto
CREATE INDEX IF NOT EXISTS idx_contactos_prospecto_estado ON contactos_prospecto(estado);
CREATE INDEX IF NOT EXISTS idx_contactos_prospecto_software_id ON contactos_prospecto(software_id);
CREATE INDEX IF NOT EXISTS idx_contactos_prospecto_fuente ON contactos_prospecto(fuente);
CREATE INDEX IF NOT EXISTS idx_contactos_prospecto_created_at ON contactos_prospecto(created_at);
CREATE INDEX IF NOT EXISTS idx_contactos_prospecto_encrypted_at ON contactos_prospecto(encrypted_at) WHERE encrypted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contactos_prospecto_encryption_key_id ON contactos_prospecto(encryption_key_id);

-- ============================================================
-- Step 4: Migration procedure (application-level encryption)
-- ============================================================
-- NOTES:
-- 1. Encryption happens at the application level (via encryptionService.ts)
-- 2. This SQL creates the schema; data migration must be executed via Node.js script
-- 3. Keep plain-text fields until full encryption is verified
-- 4. Implement gradual rollout: encrypt new records, migrate existing in batch

-- Example migration script to be run via Node.js:
-- npx ts-node scripts/encrypt-pii.ts

-- ============================================================
-- Step 5: Add audit trigger for encryption changes (PostgreSQL specific)
-- ============================================================
-- Optional: Create audit log for encryption operations

CREATE TABLE IF NOT EXISTS encryption_audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  operation VARCHAR(50) NOT NULL, -- encrypt | re_encrypt | decrypt_access
  key_id VARCHAR(255),
  user_id INT,
  ip_address VARCHAR(50),
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_table_record ON encryption_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_created_at ON encryption_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_log_operation ON encryption_audit_log(operation);

-- ============================================================
-- Step 6: Add data retention policy view
-- ============================================================
-- For GDPR compliance: identify records eligible for purge after retention period

CREATE OR REPLACE VIEW encrypted_pii_records AS
SELECT
  'clientes_global' as table_name,
  id::TEXT,
  encrypted_at,
  encryption_key_id,
  EXTRACT(DAY FROM NOW() - encrypted_at) as days_encrypted
FROM clientes_global
WHERE encrypted_at IS NOT NULL
UNION ALL
SELECT
  'leads' as table_name,
  id::TEXT,
  encrypted_at,
  encryption_key_id,
  EXTRACT(DAY FROM NOW() - encrypted_at) as days_encrypted
FROM leads
WHERE encrypted_at IS NOT NULL
UNION ALL
SELECT
  'contactos_prospecto' as table_name,
  id::TEXT,
  encrypted_at,
  encryption_key_id,
  EXTRACT(DAY FROM NOW() - encrypted_at) as days_encrypted
FROM contactos_prospecto
WHERE encrypted_at IS NOT NULL
ORDER BY encrypted_at DESC;

-- ============================================================
-- Step 7: Performance optimization
-- ============================================================
-- Analyze tables after schema changes (PostgreSQL)
-- ANALYZE clientes_global;
-- ANALYZE leads;
-- ANALYZE contactos_prospecto;

-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================
-- If rollback is needed:
-- 1. Decrypt all records via encryptionService.decryptFromString()
-- 2. Update plain-text fields with decrypted values
-- 3. Drop encrypted columns:
--    ALTER TABLE clientes_global DROP COLUMN encrypted_nombre, encrypted_email, encrypted_telefono, encryption_key_id, encrypted_at;
--    ALTER TABLE leads DROP COLUMN encrypted_nombre, encrypted_email, encrypted_telefono, encryption_key_id, encrypted_at;
--    DROP TABLE contactos_prospecto;
--    DROP TABLE encryption_audit_log;
--    DROP VIEW encrypted_pii_records;
