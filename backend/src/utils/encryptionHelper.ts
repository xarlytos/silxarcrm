/**
 * Helper utilities for common encryption patterns in the CRM
 * Provides convenient wrappers around encryptionService for application code
 */

import { encryptionService } from '../services/encryptionService';

/**
 * Create a Lead with automatic PII encryption
 * Usage: const lead = createLeadWithEncryption({ nombre: 'Juan', email: 'juan@example.com', ... })
 */
export async function createLeadWithEncryption(data: {
  nombre: string;
  email?: string;
  telefono?: string;
  [key: string]: any;
}) {
  const keyId = process.env.ENCRYPTION_KEY_ID;

  return {
    ...data,
    encrypted_nombre: data.nombre
      ? encryptionService.encryptToString(data.nombre, keyId)
      : null,
    encrypted_email: data.email
      ? encryptionService.encryptToString(data.email, keyId)
      : null,
    encrypted_telefono: data.telefono
      ? encryptionService.encryptToString(data.telefono, keyId)
      : null,
    encryption_key_id: keyId || 'default-2024-01',
    encrypted_at: new Date(),
  };
}

/**
 * Decrypt a Lead record's PII fields
 * Returns a Lead with decrypted nombre, email, telefono fields
 */
export function decryptLead(record: any) {
  if (!record.encrypted_at) {
    // Not encrypted, return as-is
    return record;
  }

  const decrypted = { ...record };

  const piiFields = [
    { field: 'nombre', encrypted: 'encrypted_nombre' },
    { field: 'email', encrypted: 'encrypted_email' },
    { field: 'telefono', encrypted: 'encrypted_telefono' },
  ];

  for (const { field, encrypted } of piiFields) {
    if (record[encrypted]) {
      try {
        const result = encryptionService.decryptFromString(record[encrypted]);
        decrypted[field] = result.plaintext;
      } catch (error) {
        console.error(
          `Failed to decrypt ${field} for record ${record.id}:`,
          error instanceof Error ? error.message : error
        );
        // Keep original encrypted field value if decryption fails
      }
    }
  }

  return decrypted;
}

/**
 * Decrypt multiple Lead records
 */
export function decryptLeads(records: any[]): any[] {
  return records.map(decryptLead);
}

/**
 * Create a ClienteGlobal with automatic PII encryption
 */
export async function createClienteGlobalWithEncryption(data: {
  nombre: string;
  email: string;
  telefono?: string;
  [key: string]: any;
}) {
  const keyId = process.env.ENCRYPTION_KEY_ID;

  return {
    ...data,
    encrypted_nombre: data.nombre
      ? encryptionService.encryptToString(data.nombre, keyId)
      : null,
    encrypted_email: data.email
      ? encryptionService.encryptToString(data.email, keyId)
      : null,
    encrypted_telefono: data.telefono
      ? encryptionService.encryptToString(data.telefono, keyId)
      : null,
    encryption_key_id: keyId || 'default-2024-01',
    encrypted_at: new Date(),
  };
}

/**
 * Decrypt a ClienteGlobal record
 */
export function decryptClienteGlobal(record: any) {
  if (!record.encrypted_at) {
    return record;
  }

  const decrypted = { ...record };

  const piiFields = [
    { field: 'nombre', encrypted: 'encrypted_nombre' },
    { field: 'email', encrypted: 'encrypted_email' },
    { field: 'telefono', encrypted: 'encrypted_telefono' },
  ];

  for (const { field, encrypted } of piiFields) {
    if (record[encrypted]) {
      try {
        const result = encryptionService.decryptFromString(record[encrypted]);
        decrypted[field] = result.plaintext;
      } catch (error) {
        console.error(
          `Failed to decrypt ${field} for record ${record.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  return decrypted;
}

/**
 * Decrypt multiple ClienteGlobal records
 */
export function decryptClientesGlobales(records: any[]): any[] {
  return records.map(decryptClienteGlobal);
}

/**
 * Create a ContactoProspecto with automatic PII encryption
 */
export async function createContactoProspectoWithEncryption(data: {
  nombre: string;
  email?: string;
  telefono?: string;
  [key: string]: any;
}) {
  const keyId = process.env.ENCRYPTION_KEY_ID;

  return {
    ...data,
    encrypted_nombre: data.nombre
      ? encryptionService.encryptToString(data.nombre, keyId)
      : null,
    encrypted_email: data.email
      ? encryptionService.encryptToString(data.email, keyId)
      : null,
    encrypted_telefono: data.telefono
      ? encryptionService.encryptToString(data.telefono, keyId)
      : null,
    encryption_key_id: keyId || 'default-2024-01',
    encrypted_at: new Date(),
  };
}

/**
 * Decrypt a ContactoProspecto record
 */
export function decryptContactoProspecto(record: any) {
  if (!record.encrypted_at) {
    return record;
  }

  const decrypted = { ...record };

  const piiFields = [
    { field: 'nombre', encrypted: 'encrypted_nombre' },
    { field: 'email', encrypted: 'encrypted_email' },
    { field: 'telefono', encrypted: 'encrypted_telefono' },
  ];

  for (const { field, encrypted } of piiFields) {
    if (record[encrypted]) {
      try {
        const result = encryptionService.decryptFromString(record[encrypted]);
        decrypted[field] = result.plaintext;
      } catch (error) {
        console.error(
          `Failed to decrypt ${field} for record ${record.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  return decrypted;
}

/**
 * Decrypt multiple ContactoProspecto records
 */
export function decryptContactosProspectos(records: any[]): any[] {
  return records.map(decryptContactoProspecto);
}

/**
 * Check if a record has encrypted PII
 */
export function isEncrypted(record: any): boolean {
  return record.encrypted_at !== null && record.encrypted_at !== undefined;
}

/**
 * Verify integrity of encrypted PII without decrypting
 * Useful for data integrity checks
 */
export function verifyRecordIntegrity(record: any): {
  nombre: boolean;
  email: boolean;
  telefono: boolean;
  anyValid: boolean;
} {
  const integrity = {
    nombre: record.encrypted_nombre
      ? encryptionService.verifyIntegrity(record.encrypted_nombre)
      : false,
    email: record.encrypted_email
      ? encryptionService.verifyIntegrity(record.encrypted_email)
      : false,
    telefono: record.encrypted_telefono
      ? encryptionService.verifyIntegrity(record.encrypted_telefono)
      : false,
    anyValid: false,
  };

  integrity.anyValid = integrity.nombre || integrity.email || integrity.telefono;

  return integrity;
}

/**
 * Re-encrypt a record with a new key ID (for key rotation)
 */
export function reencryptRecord(
  record: any,
  newKeyId: string
): { [key: string]: string | null | Date } {
  const reencrypted: { [key: string]: string | null | Date } = {};

  const piiFields = ['nombre', 'email', 'telefono'];

  for (const field of piiFields) {
    const encryptedField = `encrypted_${field}`;
    if (record[encryptedField]) {
      try {
        reencrypted[encryptedField] = encryptionService.reEncrypt(
          record[encryptedField],
          newKeyId
        );
      } catch (error) {
        console.error(
          `Failed to re-encrypt ${field}:`,
          error instanceof Error ? error.message : error
        );
        reencrypted[encryptedField] = null;
      }
    } else {
      reencrypted[encryptedField] = null;
    }
  }

  reencrypted.encryption_key_id = newKeyId;
  reencrypted.encrypted_at = new Date();

  return reencrypted;
}

/**
 * Batch decrypt records (optimized for memory)
 * Useful for processing large result sets
 */
export async function decryptRecordsBatch<T extends any>(
  records: T[],
  recordType: 'lead' | 'cliente_global' | 'contacto_prospecto',
  batchSize: number = 100
): Promise<T[]> {
  const decryptFn =
    recordType === 'lead'
      ? decryptLead
      : recordType === 'cliente_global'
        ? decryptClienteGlobal
        : decryptContactoProspecto;

  const decrypted: T[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const decryptedBatch = batch.map(decryptFn);
    decrypted.push(...decryptedBatch);

    // Yield control to avoid blocking event loop
    await new Promise((resolve) => setImmediate(resolve));
  }

  return decrypted;
}

/**
 * Create a masked version of a record (for logging/display without full decryption)
 * Shows only first and last character of PII fields
 */
export function maskRecord(record: any): any {
  const masked = { ...record };

  const maskField = (value: string | null | undefined): string => {
    if (!value) return '';
    if (value.length <= 2) return '*'.repeat(value.length);
    return value.charAt(0) + '*'.repeat(value.length - 2) + value.charAt(value.length - 1);
  };

  if (record.nombre) {
    masked.nombre = maskField(record.nombre);
  }
  if (record.email && !record.encrypted_at) {
    masked.email = maskField(record.email);
  }
  if (record.telefono && !record.encrypted_at) {
    masked.telefono = maskField(record.telefono);
  }

  return masked;
}

export default {
  createLeadWithEncryption,
  decryptLead,
  decryptLeads,
  createClienteGlobalWithEncryption,
  decryptClienteGlobal,
  decryptClientesGlobales,
  createContactoProspectoWithEncryption,
  decryptContactoProspecto,
  decryptContactosProspectos,
  isEncrypted,
  verifyRecordIntegrity,
  reencryptRecord,
  decryptRecordsBatch,
  maskRecord,
};
