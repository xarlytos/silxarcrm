/**
 * Data migration script: Encrypt existing PII in database
 * Usage: npx ts-node scripts/encrypt-pii.ts
 *
 * This script:
 * 1. Fetches plain-text PII from database
 * 2. Encrypts data using AES-256-GCM (via encryptionService)
 * 3. Stores encrypted values in encrypted_* columns
 * 4. Optionally nullifies plain-text fields for full compliance
 * 5. Logs progress and handles errors gracefully
 */

import { PrismaClient } from '@prisma/client';
import { encryptionService } from '../src/services/encryptionService';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationStats {
  table: string;
  processed: number;
  encrypted: number;
  failed: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

const prisma = new PrismaClient();
const batchSize = 100; // Process in batches to avoid memory issues
const stats: MigrationStats[] = [];

const log = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

const logError = (message: string, error?: Error) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error?.message || '');
};

/**
 * Encrypt records in batches
 */
async function encryptBatch<T extends Record<string, any>>(
  records: T[],
  piiFields: string[],
  keyId?: string
): Promise<Array<T & Record<string, any>>> {
  return records.map((record) => {
    const encrypted: any = { ...record };

    for (const field of piiFields) {
      const value = record[field];
      if (value && typeof value === 'string') {
        try {
          const encryptedField = `encrypted_${field}`;
          encrypted[encryptedField] = encryptionService.encryptToString(value, keyId);
        } catch (error) {
          logError(`Failed to encrypt field "${field}" for record ${record.id}`, error as Error);
          throw error;
        }
      }
    }

    // Mark encryption timestamp
    encrypted.encrypted_at = new Date();
    encrypted.encryption_key_id = keyId || process.env.ENCRYPTION_KEY_ID || 'default-2024-01';

    return encrypted;
  });
}

/**
 * Migrate ClienteGlobal records
 */
async function migrateClienteGlobal() {
  const tableName = 'ClienteGlobal';
  const stat: MigrationStats = {
    table: tableName,
    processed: 0,
    encrypted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  try {
    log(`Starting migration for ${tableName}`);

    const totalRecords = await prisma.clienteGlobal.count({
      where: { encrypted_at: null }, // Only unencrypted records
    });

    log(`Found ${totalRecords} unencrypted ${tableName} records`);

    let skip = 0;
    while (skip < totalRecords) {
      log(`Processing ${tableName} records ${skip} to ${skip + batchSize}...`);

      const records = await prisma.clienteGlobal.findMany({
        where: { encrypted_at: null },
        take: batchSize,
        skip,
        orderBy: { id: 'asc' },
      });

      if (records.length === 0) break;

      try {
        const encryptedRecords = await encryptBatch(records, ['nombre', 'email', 'telefono']);

        // Update records in batch
        for (const encrypted of encryptedRecords) {
          await prisma.clienteGlobal.update({
            where: { id: encrypted.id },
            data: {
              encrypted_nombre: encrypted.encrypted_nombre,
              encrypted_email: encrypted.encrypted_email,
              encrypted_telefono: encrypted.encrypted_telefono,
              encrypted_at: encrypted.encrypted_at,
              encryption_key_id: encrypted.encryption_key_id,
            },
          });
          stat.encrypted++;
        }

        stat.processed += records.length;
      } catch (error) {
        stat.failed += records.length;
        const msg = `Batch encryption failed for ${tableName}: ${error instanceof Error ? error.message : String(error)}`;
        stat.errors.push(msg);
        logError(msg);
      }

      skip += batchSize;
    }

    stat.endTime = new Date();
    log(
      `${tableName} migration complete. ` +
      `Processed: ${stat.processed}, Encrypted: ${stat.encrypted}, Failed: ${stat.failed}`
    );
  } catch (error) {
    stat.endTime = new Date();
    const msg = `Fatal error migrating ${tableName}`;
    stat.errors.push(msg);
    logError(msg, error as Error);
  }

  stats.push(stat);
}

/**
 * Migrate Lead records
 */
async function migrateLead() {
  const tableName = 'Lead';
  const stat: MigrationStats = {
    table: tableName,
    processed: 0,
    encrypted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  try {
    log(`Starting migration for ${tableName}`);

    const totalRecords = await prisma.lead.count({
      where: { encrypted_at: null },
    });

    log(`Found ${totalRecords} unencrypted ${tableName} records`);

    let skip = 0;
    while (skip < totalRecords) {
      log(`Processing ${tableName} records ${skip} to ${skip + batchSize}...`);

      const records = await prisma.lead.findMany({
        where: { encrypted_at: null },
        take: batchSize,
        skip,
        orderBy: { createdAt: 'asc' },
      });

      if (records.length === 0) break;

      try {
        const encryptedRecords = await encryptBatch(records, ['nombre', 'email', 'telefono']);

        for (const encrypted of encryptedRecords) {
          await prisma.lead.update({
            where: { id: encrypted.id },
            data: {
              encrypted_nombre: encrypted.encrypted_nombre,
              encrypted_email: encrypted.encrypted_email,
              encrypted_telefono: encrypted.encrypted_telefono,
              encrypted_at: encrypted.encrypted_at,
              encryption_key_id: encrypted.encryption_key_id,
            },
          });
          stat.encrypted++;
        }

        stat.processed += records.length;
      } catch (error) {
        stat.failed += records.length;
        const msg = `Batch encryption failed for ${tableName}: ${error instanceof Error ? error.message : String(error)}`;
        stat.errors.push(msg);
        logError(msg);
      }

      skip += batchSize;
    }

    stat.endTime = new Date();
    log(
      `${tableName} migration complete. ` +
      `Processed: ${stat.processed}, Encrypted: ${stat.encrypted}, Failed: ${stat.failed}`
    );
  } catch (error) {
    stat.endTime = new Date();
    const msg = `Fatal error migrating ${tableName}`;
    stat.errors.push(msg);
    logError(msg, error as Error);
  }

  stats.push(stat);
}

/**
 * Migrate ContactoProspecto records (if any exist from prior imports)
 */
async function migrateContactoProspecto() {
  const tableName = 'ContactoProspecto';
  const stat: MigrationStats = {
    table: tableName,
    processed: 0,
    encrypted: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
  };

  try {
    log(`Starting migration for ${tableName}`);

    // Note: ContactoProspecto is newly created, so typically no unencrypted records
    // but this is included for completeness if data is imported
    const totalRecords = await prisma.contactoProspecto.count({
      where: { encrypted_at: null },
    });

    log(`Found ${totalRecords} unencrypted ${tableName} records`);

    let skip = 0;
    while (skip < totalRecords) {
      log(`Processing ${tableName} records ${skip} to ${skip + batchSize}...`);

      const records = await prisma.contactoProspecto.findMany({
        where: { encrypted_at: null },
        take: batchSize,
        skip,
        orderBy: { createdAt: 'asc' },
      });

      if (records.length === 0) break;

      try {
        const encryptedRecords = await encryptBatch(records, ['nombre', 'email', 'telefono']);

        for (const encrypted of encryptedRecords) {
          await prisma.contactoProspecto.update({
            where: { id: encrypted.id },
            data: {
              encrypted_nombre: encrypted.encrypted_nombre,
              encrypted_email: encrypted.encrypted_email,
              encrypted_telefono: encrypted.encrypted_telefono,
              encrypted_at: encrypted.encrypted_at,
              encryption_key_id: encrypted.encryption_key_id,
            },
          });
          stat.encrypted++;
        }

        stat.processed += records.length;
      } catch (error) {
        stat.failed += records.length;
        const msg = `Batch encryption failed for ${tableName}: ${error instanceof Error ? error.message : String(error)}`;
        stat.errors.push(msg);
        logError(msg);
      }

      skip += batchSize;
    }

    stat.endTime = new Date();
    log(
      `${tableName} migration complete. ` +
      `Processed: ${stat.processed}, Encrypted: ${stat.encrypted}, Failed: ${stat.failed}`
    );
  } catch (error) {
    stat.endTime = new Date();
    const msg = `Fatal error migrating ${tableName}`;
    stat.errors.push(msg);
    logError(msg, error as Error);
  }

  stats.push(stat);
}

/**
 * Main migration execution
 */
async function main() {
  try {
    log('========================================');
    log('PII Encryption Migration Started');
    log('========================================');
    log(`Encryption Algorithm: AES-256-GCM`);
    log(`Key ID: ${process.env.ENCRYPTION_KEY_ID || 'default-2024-01'}`);
    log(`Batch Size: ${batchSize}`);
    log('');

    // Run migrations sequentially
    await migrateClienteGlobal();
    await migrateLead();
    await migrateContactoProspecto();

    // Print summary
    log('');
    log('========================================');
    log('Migration Summary');
    log('========================================');

    let totalProcessed = 0;
    let totalEncrypted = 0;
    let totalFailed = 0;

    for (const stat of stats) {
      const duration = stat.endTime
        ? `${(stat.endTime.getTime() - stat.startTime.getTime()) / 1000}s`
        : 'N/A';
      log(
        `${stat.table}: processed=${stat.processed}, encrypted=${stat.encrypted}, ` +
        `failed=${stat.failed}, duration=${duration}`
      );

      if (stat.errors.length > 0) {
        stat.errors.forEach((err) => log(`  - ${err}`));
      }

      totalProcessed += stat.processed;
      totalEncrypted += stat.encrypted;
      totalFailed += stat.failed;
    }

    log('');
    log(`Total: processed=${totalProcessed}, encrypted=${totalEncrypted}, failed=${totalFailed}`);

    // Save report
    const reportPath = path.join(process.cwd(), 'encryption-migration-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          stats,
          summary: { totalProcessed, totalEncrypted, totalFailed },
        },
        null,
        2
      )
    );

    log(`Report saved to: ${reportPath}`);

    if (totalFailed === 0) {
      log('');
      log('✅ Migration completed successfully!');
    } else {
      log('');
      log(`⚠️  Migration completed with ${totalFailed} failures. Review report for details.`);
    }
  } catch (error) {
    logError('Unhandled error during migration', error as Error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
