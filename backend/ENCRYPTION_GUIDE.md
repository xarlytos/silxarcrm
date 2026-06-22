# Field-Level Encryption Implementation Guide

## Overview

This implementation adds **AES-256-GCM encryption** for personally identifiable information (PII) in the Silxar CRM database. It provides GDPR/CCPA-compliant data protection for sensitive fields across three models:

- **Lead** (nombre, email, telefono)
- **ClienteGlobal** (nombre, email, telefono)
- **ContactoProspecto** (nombre, email, telefono) — newly created

## Architecture

### Encryption Method: AES-256-GCM

**Why GCM?**
- **AES-256**: 256-bit symmetric encryption (NIST-approved)
- **GCM**: Galois/Counter Mode provides:
  - Confidentiality (encryption)
  - Authenticity (GMAC tag detection)
  - Tamper detection (fails on corruption)

**Key Derivation:**
- PBKDF2 with SHA-256
- 100,000 iterations (NIST recommendation)
- Unique salt per record (prevents rainbow tables)
- Key versioning via `encryption_key_id`

### Schema Changes

Each model gains 4 new columns:

```sql
encrypted_nombre VARCHAR       -- Base64-encoded encrypted name
encrypted_email VARCHAR        -- Base64-encoded encrypted email
encrypted_telefono VARCHAR     -- Base64-encoded encrypted phone
encryption_key_id VARCHAR      -- Key version for rotation support
encrypted_at TIMESTAMP         -- Timestamp when encrypted
```

**Storage Format:**
```
keyId::ciphertext|iv|salt|authTag

Example:
default-2024-01::SGVsbG8gV29ybGQ=|abc123=|def456=|ghi789=
```

## Setup Instructions

### 1. Generate Master Key (Run Once)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output example:
```
a3f7b9c2d8e1f4a6b9c2d8e1f4a6b9c2d8e1f4a6b9c2d8e1f4a6b9c2d8e1f4
```

**CRITICAL:** Store this securely in a secrets vault (AWS Secrets Manager, HashiCorp Vault, etc.)

### 2. Configure Environment

Add to `.env`:

```env
ENCRYPTION_MASTER_KEY=a3f7b9c2d8e1f4a6b9c2d8e1f4a6b9c2d8e1f4a6b9c2d8e1f4a6b9c2d8e1f4
ENCRYPTION_KEY_ID=default-2024-01
ENCRYPTION_ENABLE_NEW_RECORDS=false
ENCRYPTION_AUDIT_LOG=true
```

### 3. Run Database Migrations

**Step A: Create new schema (encrypted columns & ContactoProspecto table)**

```bash
cd backend
psql -U $DB_USER -d $DB_NAME -f prisma/migrations/encryption_migration.sql
```

Or via Prisma:

```bash
npx prisma migrate deploy
```

**Step B: Encrypt existing data**

```bash
npx ts-node scripts/encrypt-pii.ts
```

This script:
- Fetches all plain-text PII records
- Encrypts in batches (100 per iteration)
- Stores encrypted values in `encrypted_*` columns
- Marks records with `encrypted_at` timestamp
- Generates report: `encryption-migration-report.json`

Expected output:
```
[2024-06-22T10:30:45.123Z] Starting migration for ClienteGlobal
[2024-06-22T10:30:45.234Z] Found 5234 unencrypted ClienteGlobal records
[2024-06-22T10:30:46.345Z] Processing ClienteGlobal records 0 to 100...
...
[2024-06-22T10:35:22.456Z] ClienteGlobal migration complete. Processed: 5234, Encrypted: 5234, Failed: 0
========================================
Migration Summary
========================================
ClienteGlobal: processed=5234, encrypted=5234, failed=0, duration=282s
Lead: processed=12456, encrypted=12456, failed=0, duration=624s
ContactoProspecto: processed=0, encrypted=0, failed=0, duration=1s

Total: processed=17690, encrypted=17690, failed=0

✅ Migration completed successfully!
```

### 4. Enable New Record Encryption

Once migration is complete and verified:

```bash
# Update .env
ENCRYPTION_ENABLE_NEW_RECORDS=true
```

Restart application. New records will automatically encrypt PII.

## API Usage

### Using EncryptionService in Code

```typescript
import { encryptionService } from './src/services/encryptionService';

// ===== Encrypt Single Field =====
const plainEmail = 'user@example.com';
const encrypted = encryptionService.encryptToString(plainEmail);
// Returns: "default-2024-01::SGVsbG8gV29ybGQ=|abc123=|def456=|ghi789="

// ===== Decrypt Single Field =====
const decrypted = encryptionService.decryptFromString(encrypted);
console.log(decrypted.plaintext); // "user@example.com"
console.log(decrypted.keyId);     // "default-2024-01"

// ===== Encrypt Multiple Fields =====
const lead = {
  id: 'lead-123',
  nombre: 'Juan García',
  email: 'juan@example.com',
  telefono: '+34912345678',
};

const encrypted = encryptionService.encryptPiiObject(lead, ['nombre', 'email', 'telefono']);
// Returns:
// {
//   id: 'lead-123',
//   nombre: 'Juan García',
//   email: 'juan@example.com',
//   telefono: '+34912345678',
//   encrypted_nombre: 'default-2024-01::...',
//   encrypted_email: 'default-2024-01::...',
//   encrypted_telefono: 'default-2024-01::...',
// }

// ===== Decrypt Multiple Fields =====
const decrypted = encryptionService.decryptPiiObject(encrypted, ['nombre', 'email', 'telefono']);
// Returns: { nombre: 'Juan García', email: 'juan@example.com', telefono: '+34912345678', ... }

// ===== Verify Integrity (No Decryption) =====
const isValid = encryptionService.verifyIntegrity(encrypted.encrypted_email);
console.log(isValid); // true or false
```

### In Prisma Operations

```typescript
import { prisma } from './config/database';
import { encryptionService } from './services/encryptionService';

// ===== Create with encryption =====
const lead = await prisma.lead.create({
  data: {
    nombre: 'Juan García',
    email: 'juan@example.com',
    telefono: '+34912345678',
    softwareId: 'groomly',
    // Encrypt before storing
    encrypted_nombre: encryptionService.encryptToString('Juan García'),
    encrypted_email: encryptionService.encryptToString('juan@example.com'),
    encrypted_telefono: encryptionService.encryptToString('+34912345678'),
    encryption_key_id: 'default-2024-01',
    encrypted_at: new Date(),
  },
});

// ===== Read and decrypt =====
const lead = await prisma.lead.findUnique({ where: { id: 'lead-123' } });

// Decrypt on-demand
if (lead.encrypted_email) {
  const decrypted = encryptionService.decryptFromString(lead.encrypted_email);
  console.log(`Email: ${decrypted.plaintext}`);
}

// ===== Bulk operations =====
const leads = await prisma.lead.findMany({ where: { softwareId: 'groomly' } });

leads.forEach(lead => {
  if (lead.encrypted_at) {
    const decrypted = encryptionService.decryptPiiObject(lead, ['nombre', 'email', 'telefono']);
    console.log(`${decrypted.nombre} (${decrypted.email})`);
  }
});
```

## Key Rotation (Future)

When rotating encryption keys:

### Step 1: Create New Key Version

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Create Migration Script

```typescript
// scripts/rotate-encryption-key.ts
import { prisma } from '../config/database';
import { encryptionService } from '../src/services/encryptionService';

const newKeyId = 'v2-2025-01';

async function rotateKeys() {
  const records = await prisma.lead.findMany({
    where: { encryption_key_id: 'default-2024-01' },
  });

  for (const record of records) {
    if (record.encrypted_email) {
      const { plaintext } = encryptionService.decryptFromString(record.encrypted_email);
      const reencrypted = encryptionService.encryptToString(plaintext, newKeyId);

      await prisma.lead.update({
        where: { id: record.id },
        data: {
          encrypted_email: reencrypted,
          encryption_key_id: newKeyId,
        },
      });
    }
  }
}

rotateKeys();
```

### Step 3: Update .env

```env
ENCRYPTION_KEY_ID=v2-2025-01
```

Encryption is backward-compatible; old keys can decrypt records encrypted with old IDs.

## Security Best Practices

### ✅ DO:

- **Store master key in secrets vault** (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
- **Rotate keys annually** (or on suspected compromise)
- **Enable audit logging** (`ENCRYPTION_AUDIT_LOG=true`)
- **Monitor decryption operations** for suspicious patterns
- **Backup encrypted database** (encryption provides confidentiality even if DB is breached)
- **Use HTTPS/TLS** for all API communications
- **Implement rate limiting** on decryption endpoints

### ❌ DON'T:

- ❌ Commit `.env` with master key to git
- ❌ Log plaintext values in debug output
- ❌ Decrypt PII unless strictly necessary
- ❌ Reuse master keys across environments
- ❌ Store encryption keys in comments or documentation
- ❌ Disable authentication for decryption operations

## Compliance

### GDPR (EU)

- ✅ Article 32: Encryption of personal data
- ✅ Article 33: Mandatory breach notifications (encrypted data reduces impact)
- ✅ Right to be forgotten: Can delete encrypted records without residue

### CCPA (California)

- ✅ "Reasonable security": AES-256-GCM is industry-standard
- ✅ Encryption exempts from breach notification requirements
- ✅ Data minimization: Only PII fields encrypted

### SOC 2 / ISO 27001

- ✅ Encryption in transit + at rest
- ✅ Key management with versioning
- ✅ Audit trail via `encryption_audit_log` table

## Troubleshooting

### Migration fails: "ENCRYPTION_MASTER_KEY not set"

```bash
# Add to .env
ENCRYPTION_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Decryption error: "authentication tag verification failed"

Causes:
- Data corrupted or tampered
- Using wrong master key
- Key ID mismatch

Solution:
```typescript
// Verify data integrity first
const isValid = encryptionService.verifyIntegrity(encryptedString);
if (!isValid) {
  console.error('Data appears corrupted. Restore from backup.');
}
```

### Performance: Encryption is slow

- Use connection pooling (already in prisma config)
- Batch encrypt/decrypt operations
- Decrypt on-demand only when needed
- Use partial indexes: `CREATE INDEX idx ON table(encrypted_at) WHERE encrypted_at IS NOT NULL`

### Forgot master key

**Data is unrecoverable if:**
- No backups exist
- Master key was not backed up

**Prevention:**
- Store master key in secure vault immediately after generation
- Keep encrypted backup of key in separate location
- Document key rotation history

## Files Created

| File | Purpose |
|------|---------|
| `src/services/encryptionService.ts` | Core encryption/decryption logic (AES-256-GCM) |
| `scripts/encrypt-pii.ts` | Data migration script to encrypt existing records |
| `prisma/migrations/encryption_migration.sql` | Schema changes and audit tables |
| `.env.encryption` | Configuration template |
| `ENCRYPTION_GUIDE.md` | This file |

## Testing

```bash
# Test encryption service
npx ts-node -e "
import { encryptionService } from './src/services/encryptionService';

const plaintext = 'test-data-123';
const encrypted = encryptionService.encryptToString(plaintext);
const decrypted = encryptionService.decryptFromString(encrypted);

console.log('Plaintext:', plaintext);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted.plaintext);
console.log('Match:', plaintext === decrypted.plaintext ? '✅' : '❌');
"
```

Expected output:
```
Plaintext: test-data-123
Encrypted: default-2024-01::SGVsbG8gV29ybGQ=|abc123=|def456=|ghi789=
Decrypted: test-data-123
Match: ✅
```

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review `encryption-migration-report.json` for migration errors
3. Enable `ENCRYPTION_AUDIT_LOG=true` to see operation history in `encryption_audit_log` table
4. Contact security team for key-related issues
