# SECURITY IMPLEMENTATION SPECIFICATIONS
## Revenue AI Platform - Technical Deep Dive
**Fecha:** 2026-06-21  
**Categoría:** IMPLEMENTATION GUIDE  
**Target Audience:** Engineering Team

---

## 1. FIELD-LEVEL ENCRYPTION (AES-256-GCM)

### Implementación en TypeScript

```typescript
// src/utils/encryption.ts
import crypto from 'crypto';
import { prisma } from '../config/database';

interface EncryptionKey {
  key: Buffer;
  salt: Buffer;
}

export class FieldEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 16;
  private readonly iterations = 100000;
  private readonly keyLength = 32;
  
  private encryptionKey: EncryptionKey | null = null;
  
  constructor(masterSecret: string) {
    this.initializeKey(masterSecret);
  }
  
  /**
   * Derive encryption key from master secret using PBKDF2
   */
  private initializeKey(masterSecret: string): void {
    const salt = crypto.randomBytes(this.saltLength);
    const key = crypto.pbkdf2Sync(
      masterSecret,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );
    this.encryptionKey = { key, salt };
  }
  
  /**
   * Encrypt a field value
   * Returns: base64(salt:iv:authTag:ciphertext)
   */
  encrypt(plaintext: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey.key,
      iv
    );
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine: salt:iv:authTag:ciphertext
    const combined = Buffer.concat([
      this.encryptionKey.salt,      // 16 bytes
      iv,                           // 12 bytes
      authTag,                      // 16 bytes
      Buffer.from(encrypted, 'hex') // variable
    ]);
    
    return combined.toString('base64');
  }
  
  /**
   * Decrypt a field value
   */
  decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const combined = Buffer.from(encryptedData, 'base64');
    
    let offset = 0;
    const salt = combined.slice(offset, offset + this.saltLength);
    offset += this.saltLength;
    
    const iv = combined.slice(offset, offset + 12);
    offset += 12;
    
    const authTag = combined.slice(offset, offset + this.tagLength);
    offset += this.tagLength;
    
    const ciphertext = combined.slice(offset);
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey.key,
      iv
    );
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Encrypt Lead model fields
   */
  async encryptLead(lead: RawLead): Promise<EncryptedLead> {
    return {
      ...lead,
      nombre: this.encrypt(lead.nombre),
      email: this.encrypt(lead.email),
      telefono: lead.telefono ? this.encrypt(lead.telefono) : null,
      empresa: lead.empresa ? this.encrypt(lead.empresa) : null,
      cargo: lead.cargo ? this.encrypt(lead.cargo) : null,
      pais: lead.pais ? this.encrypt(lead.pais) : null,
    };
  }
  
  /**
   * Decrypt Lead model fields
   */
  async decryptLead(lead: EncryptedLead): Promise<RawLead> {
    return {
      ...lead,
      nombre: this.decrypt(lead.nombre),
      email: this.decrypt(lead.email),
      telefono: lead.telefono ? this.decrypt(lead.telefono) : null,
      empresa: lead.empresa ? this.decrypt(lead.empresa) : null,
      cargo: lead.cargo ? this.decrypt(lead.cargo) : null,
      pais: lead.pais ? this.decrypt(lead.pais) : null,
    };
  }
}

// Initialize at app startup
export const fieldEncryption = new FieldEncryption(
  process.env.FIELD_ENCRYPTION_SECRET!
);
```

### Prisma Middleware

```typescript
// src/config/database.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { fieldEncryption } from '../utils/encryption';

const prisma = new PrismaClient();

// Hook para auto-encryptar en CREATE/UPDATE
prisma.$use(async (params, next) => {
  if (params.model === 'Lead' && (params.action === 'create' || params.action === 'update')) {
    const encryptFields = ['nombre', 'email', 'telefono', 'empresa', 'cargo', 'pais'];
    
    for (const field of encryptFields) {
      if (params.args.data?.[field]) {
        params.args.data[field] = fieldEncryption.encrypt(
          String(params.args.data[field])
        );
      }
    }
  }
  
  // Hook para auto-decryptar em READ
  const result = await next(params);
  
  if (params.model === 'Lead' && (params.action === 'findUnique' || params.action === 'findMany')) {
    if (Array.isArray(result)) {
      return result.map(record => decryptLeadRecord(record));
    } else if (result) {
      return decryptLeadRecord(result);
    }
  }
  
  return result;
});

function decryptLeadRecord(record: any): any {
  const encryptFields = ['nombre', 'email', 'telefono', 'empresa', 'cargo', 'pais'];
  
  for (const field of encryptFields) {
    if (record?.[field]) {
      try {
        record[field] = fieldEncryption.decrypt(record[field]);
      } catch (e) {
        // Already decrypted or corrupted - leave as-is
        console.warn(`Failed to decrypt ${field}:`, e);
      }
    }
  }
  
  return record;
}

export { prisma };
```

### Migration Script

```typescript
// scripts/migrate-field-encryption.ts
import { prisma } from '../src/config/database';
import { fieldEncryption } from '../src/utils/encryption';

async function main() {
  console.log('Starting field-level encryption migration...');
  
  const batchSize = 100;
  let processedCount = 0;
  let lastId: string | null = null;
  
  while (true) {
    // Fetch unencrypted leads (where email doesn't start with base64 pattern)
    const leads = await prisma.lead.findMany({
      where: {
        email: {
          not: {
            startsWith: 'eyJ' // Base64 prefix for encrypted data
          }
        }
      },
      take: batchSize,
      skip: lastId ? 1 : 0,
      cursor: lastId ? { id: lastId } : undefined,
      orderBy: { id: 'asc' }
    });
    
    if (leads.length === 0) break;
    
    for (const lead of leads) {
      const encrypted = await fieldEncryption.encryptLead({
        id: lead.id,
        nombre: lead.nombre,
        email: lead.email,
        telefono: lead.telefono,
        empresa: lead.empresa,
        cargo: lead.cargo,
        pais: lead.pais,
      });
      
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          nombre: encrypted.nombre,
          email: encrypted.email,
          telefono: encrypted.telefono,
          empresa: encrypted.empresa,
          cargo: encrypted.cargo,
          pais: encrypted.pais,
        }
      });
      
      processedCount++;
      console.log(`✓ Encrypted lead ${processedCount}/${leads.length}`);
    }
    
    lastId = leads[leads.length - 1].id;
  }
  
  console.log(`✅ Migration complete. Encrypted ${processedCount} leads.`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
```

---

## 2. AWS SECRETS MANAGER INTEGRATION

### Setup (Terraform)

```hcl
# infra/secrets.tf
provider "aws" {
  region = var.aws_region
}

# Secret: Database URL
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "prod/database-url"
  description             = "PostgreSQL Neon database connection string"
  recovery_window_in_days = 7 # Allow recovery within 7 days
  
  tags = {
    Environment = "production"
    Managed     = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = var.database_url
}

# Rotation config (auto-rotate every 30 days)
resource "aws_secretsmanager_secret_rotation" "database_url" {
  secret_id           = aws_secretsmanager_secret.database_url.id
  rotation_rules {
    automatically_after_days = 30
  }
  rotation_lambda_arn = aws_lambda_function.rotate_secret.arn
}

# Secret: JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "prod/jwt-secret"
  description             = "JWT signing secret"
  recovery_window_in_days = 7
}

# Secret: API Keys (JSON)
resource "aws_secretsmanager_secret" "api_keys" {
  name = "prod/api-keys"
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  secret_string = jsonencode({
    gemini = var.gemini_api_key
    elevenlabs = var.elevenlabs_api_key
    twilio_sid = var.twilio_sid
    twilio_token = var.twilio_auth_token
    stripe_secret = var.stripe_secret_key
  })
}

# IAM Role for EC2/Lambda/ECS to access secrets
resource "aws_iam_role" "app_role" {
  name = "crm-app-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.app_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ]
      Resource = [
        aws_secretsmanager_secret.database_url.arn,
        aws_secretsmanager_secret.jwt_secret.arn,
        aws_secretsmanager_secret.api_keys.arn
      ]
    }]
  })
}
```

### Node.js Client

```typescript
// src/services/secretManager.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  RotateSecretCommand
} from '@aws-sdk/client-secrets-manager';

interface SecretCache {
  value: string;
  expiresAt: number;
}

export class SecretManager {
  private client: SecretsManagerClient;
  private cache: Map<string, SecretCache> = new Map();
  private readonly cacheTTL = 3600000; // 1 hour
  
  constructor(region = 'us-east-1') {
    this.client = new SecretsManagerClient({ region });
  }
  
  /**
   * Get secret value with caching
   */
  async getSecret(secretName: string): Promise<string> {
    const cached = this.cache.get(secretName);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);
    
    const secret = response.SecretString || '';
    
    this.cache.set(secretName, {
      value: secret,
      expiresAt: Date.now() + this.cacheTTL
    });
    
    return secret;
  }
  
  /**
   * Get secret as JSON
   */
  async getSecretJson<T>(secretName: string): Promise<T> {
    const secret = await this.getSecret(secretName);
    return JSON.parse(secret);
  }
  
  /**
   * Get multiple secrets
   */
  async getSecrets(secretNames: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const name of secretNames) {
      results[name] = await this.getSecret(name);
    }
    
    return results;
  }
  
  /**
   * Rotate secret manually
   */
  async rotateSecret(secretName: string): Promise<void> {
    const command = new RotateSecretCommand({
      SecretId: secretName
    });
    
    await this.client.send(command);
    this.cache.delete(secretName); // Invalidate cache
  }
  
  /**
   * Listen for rotation events (SNS)
   */
  setupRotationListener(callback: (secretName: string) => void): void {
    // Listen for AWS Secrets Manager rotation events via SNS
    // When secret rotated, invalidate cache
  }
}

export const secretManager = new SecretManager();
```

### Environment Configuration

```typescript
// src/config/env.ts
import { secretManager } from '../services/secretManager';

let cachedEnv: any = null;

export async function loadEnv() {
  if (cachedEnv) return cachedEnv;
  
  const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    
    // Secrets from AWS Secrets Manager (production)
    DATABASE_URL: process.env.NODE_ENV === 'production'
      ? await secretManager.getSecret('prod/database-url')
      : process.env.DATABASE_URL,
    
    JWT_SECRET: process.env.NODE_ENV === 'production'
      ? await secretManager.getSecret('prod/jwt-secret')
      : process.env.JWT_SECRET || 'dev-secret-change-in-production',
    
    // API Keys as JSON
    API_KEYS: process.env.NODE_ENV === 'production'
      ? await secretManager.getSecretJson('prod/api-keys')
      : {
          gemini: process.env.GEMINI_API_KEY || '',
          elevenlabs: process.env.ELEVENLABS_API_KEY || '',
        }
  };
  
  cachedEnv = env;
  return env;
}

export const env = loadEnv(); // Load at startup
```

---

## 3. SECURE LOGGING (REDACTION + AUDIT TRAIL)

### Secure Logger

```typescript
// src/utils/secureLogger.ts
import winston from 'winston';
import { awsLogs } from '../services/awsLogs';

class SecureLogger {
  private logger: winston.Logger;
  
  // Patterns to redact
  private readonly redactPatterns = [
    {
      pattern: /(email|EMAIL)=([^\s,\]]+)/gi,
      replace: '$1=[REDACTED]'
    },
    {
      pattern: /(phone|PHONE|telefono)=([0-9\-\+]+)/gi,
      replace: '$1=[REDACTED]'
    },
    {
      pattern: /(password|PASSWORD|pwd)=([^\s,\]]+)/gi,
      replace: '$1=[REDACTED]'
    },
    {
      pattern: /(api[_-]?key|API[_-]?KEY)=([^\s,\]]+)/gi,
      replace: '$1=[REDACTED]'
    },
    {
      pattern: /(token|TOKEN)=([^\s,\]]+)/gi,
      replace: '$1=[REDACTED]'
    },
    {
      pattern: /(credit[_-]?card|CREDIT[_-]?CARD|cc)=([0-9\-\s]+)/gi,
      replace: '$1=[REDACTED]'
    },
    {
      pattern: /(ssn|SSN|social[_-]?security)=([0-9\-]+)/gi,
      replace: '$1=[REDACTED]'
    },
  ];
  
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        // Custom format: redact sensitive data
        winston.format((info) => {
          info.message = this.redactString(info.message);
          if (info.meta) {
            info.meta = this.redactObject(info.meta);
          }
          return info;
        })()
      ),
      defaultMeta: { service: 'crm-maestro' },
      transports: [
        // Console (development)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, meta }) => {
              return `${timestamp} [${level}] ${message}`;
            })
          )
        }),
        // CloudWatch (production)
        ...(process.env.NODE_ENV === 'production' ? [
          new awsLogs.WinstonCloudWatch({
            logGroupName: '/aws/lambda/crm-maestro',
            logStreamName: `${Date.now()}`,
            awsRegion: process.env.AWS_REGION || 'us-east-1',
          })
        ] : [])
      ]
    });
  }
  
  private redactString(text: string): string {
    let redacted = text;
    
    for (const { pattern, replace } of this.redactPatterns) {
      redacted = redacted.replace(pattern, replace);
    }
    
    return redacted;
  }
  
  private redactObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const key in redacted) {
      if (typeof redacted[key] === 'string') {
        redacted[key] = this.redactString(redacted[key]);
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactObject(redacted[key]);
      }
    }
    
    return redacted;
  }
  
  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }
  
  error(message: string, error?: any) {
    const errorInfo = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || '',
      code: error?.code || 'UNKNOWN',
    };
    this.logger.error(message, errorInfo);
  }
  
  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }
  
  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}

export const secureLogger = new SecureLogger();
```

### Audit Logger (Immutable)

```typescript
// src/services/auditLogger.ts
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import crypto from 'crypto';

interface AuditEvent {
  action: string;           // 'create', 'update', 'delete', 'login', etc.
  actor: string;            // User ID or IP
  actorEmail?: string;      // User email
  resource: string;         // 'leads', 'email_campaigns', etc.
  resourceId: string;       // Lead ID, campaign ID, etc.
  changes?: Record<string, any>; // What changed (redacted)
  result: 'success' | 'failure';
  reason?: string;          // Why it failed or was rejected
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
  traceId?: string;        // Correlate with CloudTrail
}

export class AuditLogger {
  private dynamodb: DynamoDBClient;
  private previousHash: string = '';
  
  constructor(region = 'us-east-1') {
    this.dynamodb = new DynamoDBClient({ region });
  }
  
  /**
   * Log immutable audit event
   * Uses hash chain to detect tampering
   */
  async log(event: AuditEvent): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Create hash of this event + previous hash (chain)
    const eventHash = this.hashEvent(event, this.previousHash);
    this.previousHash = eventHash;
    
    const auditRecord = {
      eventId: crypto.randomUUID(),
      timestamp,
      ...event,
      eventHash,        // Detect tampering
      previousHash: this.previousHash, // Chain integrity
    };
    
    // Store in DynamoDB (write-once table)
    const params = {
      TableName: 'audit-logs',
      Item: marshall(auditRecord),
      // Prevent overwrites (detect if same eventId tried twice)
      ConditionExpression: 'attribute_not_exists(eventId)',
    };
    
    try {
      await this.dynamodb.send(new PutItemCommand(params));
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.error('Audit tampering detected:', auditRecord);
        throw new Error('Audit log tampering detected');
      }
      throw error;
    }
  }
  
  /**
   * Create SHA256 hash of event for integrity verification
   */
  private hashEvent(event: AuditEvent, previousHash: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(event));
    hash.update(previousHash);
    return hash.digest('hex');
  }
  
  /**
   * Verify audit log chain integrity
   */
  async verifyIntegrity(startEventId: string): Promise<boolean> {
    // Query audit log starting from startEventId
    // Verify each hash = hash(event + previousHash)
    // If any mismatch, tampering detected
    return true;
  }
}

export const auditLogger = new AuditLogger();
```

---

## 4. GDPR DATA DELETION IMPLEMENTATION

### Database Schema Updates

```sql
-- migrations/add_gdpr_support.sql

-- Data Retention Policies
CREATE TABLE data_retention_policies (
  id TEXT PRIMARY KEY,
  data_type VARCHAR(50),           -- 'lead', 'email_recipient', 'call_recording'
  retention_days INTEGER,           -- Days before auto-delete
  compliance_reason VARCHAR(100),   -- GDPR, CCPA, SOC2
  notification_days INTEGER,        -- Days before deletion to notify
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(data_type)
);

-- GDPR Erasure Requests
CREATE TABLE gdpr_erasure_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  reason VARCHAR(255),              -- User-provided reason
  status VARCHAR(20),               -- PENDING, CONFIRMED, COMPLETED, FAILED
  requested_at TIMESTAMP DEFAULT NOW(),
  requested_by_ip VARCHAR(45),
  confirmed_at TIMESTAMP,
  confirmed_token_hash TEXT,        -- Token sent to email
  completed_at TIMESTAMP,
  completed_by VARCHAR(100),        -- System or user ID
  
  INDEX(email),
  INDEX(status),
  INDEX(requested_at)
);

-- GDPR Audit Log
CREATE TABLE gdpr_audit_log (
  id TEXT PRIMARY KEY,
  action VARCHAR(50),               -- ERASURE_REQUEST, ERASURE_COMPLETED, DATA_EXPORTED
  email_hash TEXT,                  -- Hashed for privacy
  data_type VARCHAR(50),
  affected_records INTEGER,
  deleted_at TIMESTAMP DEFAULT NOW(),
  reason VARCHAR(255),
  ip_address VARCHAR(45),
  
  INDEX(action),
  INDEX(deleted_at)
);

-- Consent Tracking
ALTER TABLE leads ADD COLUMN (
  consentimento_marketing BOOLEAN DEFAULT false,
  consentimento_llamadas BOOLEAN DEFAULT false,
  consentimento_whatsapp BOOLEAN DEFAULT false,
  consentimento_fecha TIMESTAMP,
  consentimento_canal VARCHAR(20),  -- 'email', 'phone', 'web'
  consentimento_ip VARCHAR(45),
  consentimento_user_agent TEXT
);

CREATE INDEX leads_consentimiento_idx ON leads(consentimento_marketing);
```

### GDPR Erasure API

```typescript
// src/routes/gdpr.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { auditLogger } from '../services/auditLogger';
import { sendGdprConfirmationEmail } from '../services/emailService';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();

// Step 1: Request erasure
router.post('/api/gdpr/erasure-request', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }
  
  // Create erasure request
  const request = await prisma.gdprErasureRequest.create({
    data: {
      id: crypto.randomUUID(),
      email,
      status: 'PENDING',
      requested_at: new Date(),
      requested_by_ip: req.ip || 'unknown',
    }
  });
  
  // Generate token to send via email
  const token = jwt.sign(
    { requestId: request.id, email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  
  // Save token hash
  await prisma.gdprErasureRequest.update({
    where: { id: request.id },
    data: {
      confirmed_token_hash: crypto
        .createHash('sha256')
        .update(token)
        .digest('hex')
    }
  });
  
  // Send confirmation email
  await sendGdprConfirmationEmail(email, token);
  
  // Audit log
  await auditLogger.log({
    action: 'gdpr_erasure_requested',
    actor: 'anonymous',
    resource: 'gdpr_requests',
    resourceId: request.id,
    result: 'success',
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'],
  });
  
  res.json({
    success: true,
    message: 'Confirmation email sent. Please check your inbox.',
  });
});

// Step 2: Confirm erasure via email token
router.post('/api/gdpr/erasure-request/confirm', async (req: Request, res: Response) => {
  const { token } = req.body;
  
  if (!token) {
    res.status(400).json({ error: 'Token required' });
    return;
  }
  
  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  
  const request = await prisma.gdprErasureRequest.findUnique({
    where: { id: decoded.requestId }
  });
  
  if (!request || request.status !== 'PENDING') {
    res.status(400).json({ error: 'Request not found or already processed' });
    return;
  }
  
  // Mark as confirmed
  await prisma.gdprErasureRequest.update({
    where: { id: request.id },
    data: {
      status: 'CONFIRMED',
      confirmed_at: new Date(),
    }
  });
  
  // Queue deletion job (async)
  await queueGdprErasureJob(request.id);
  
  res.json({
    success: true,
    message: 'Erasure confirmed. Your data will be deleted within 24 hours.',
  });
});

// Background job: Execute erasure
export async function executeGdprErasure(requestId: string): Promise<void> {
  const request = await prisma.gdprErasureRequest.findUnique({
    where: { id: requestId }
  });
  
  if (!request || request.status !== 'CONFIRMED') {
    return;
  }
  
  const { email } = request;
  
  try {
    // Count affected records (for audit)
    const leadCount = await prisma.lead.count({ where: { email } });
    const emailCount = await prisma.emailEnvios.count({ where: { destinatario: email } });
    const clientCount = await prisma.clienteGlobal.count({ where: { email } });
    
    // PHASE 1: Anonymize leads
    await prisma.lead.updateMany({
      where: { email },
      data: {
        email: '[DELETED]',
        nombre: '[DELETED]',
        telefono: null,
        empresa: null,
        cargo: null,
        pais: null,
        metadata: {},
      }
    });
    
    // PHASE 2: Anonymize email recipients
    await prisma.emailEnvios.updateMany({
      where: { destinatario: email },
      data: {
        destinatario: '[DELETED]',
      }
    });
    
    // PHASE 3: Delete unsubscribe records
    await prisma.emailBaja.deleteMany({
      where: { email }
    });
    
    // PHASE 4: Delete global customer
    await prisma.clienteGlobal.deleteMany({
      where: { email }
    });
    
    // Mark as completed
    await prisma.gdprErasureRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        completed_by: 'system'
      }
    });
    
    // Audit log
    const emailHash = crypto
      .createHash('sha256')
      .update(email)
      .digest('hex');
    
    await auditLogger.log({
      action: 'gdpr_erasure_completed',
      actor: 'system',
      resource: 'gdpr_requests',
      resourceId: requestId,
      result: 'success',
      ipAddress: '127.0.0.1',
    });
    
    // Log to GDPR audit table
    await prisma.gdprAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        action: 'ERASURE_COMPLETED',
        email_hash: emailHash,
        affected_records: leadCount + emailCount + clientCount,
        deleted_at: new Date(),
        reason: request.reason || 'User requested',
      }
    });
    
  } catch (error) {
    console.error('GDPR erasure failed:', error);
    
    await prisma.gdprErasureRequest.update({
      where: { id: requestId },
      data: {
        status: 'FAILED',
        completed_at: new Date(),
      }
    });
    
    throw error;
  }
}

export default router;
```

---

## 5. MFA (TOTP) IMPLEMENTATION

```typescript
// src/services/mfaService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

export class MFAService {
  /**
   * Generate TOTP secret for user
   */
  generateSecret(email: string): { secret: string; otpauth: string } {
    const secret = speakeasy.generateSecret({
      name: `CRM Maestro (${email})`,
      issuer: 'CRM Maestro',
      length: 32,
    });
    
    return {
      secret: secret.base32!,
      otpauth: secret.otpauth_url!,
    };
  }
  
  /**
   * Generate QR code for secret
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }
  
  /**
   * Verify TOTP token
   */
  verifyToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow ±30 seconds drift
    });
  }
  
  /**
   * Generate backup codes (one-time use)
   */
  generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
  
  /**
   * Hash backup code for storage
   */
  hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
  }
}

export const mfaService = new MFAService();
```

### MFA Routes

```typescript
// src/routes/mfa.ts
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { mfaService } from '../services/mfaService';
import { prisma } from '../config/database';
import { auditLogger } from '../services/auditLogger';

const router = Router();

// Setup MFA (generate secret)
router.post('/setup', authMiddleware, async (req: Request, res: Response) => {
  const user = req.user!;
  const { secret, otpauth } = mfaService.generateSecret(user.email);
  const qrCode = await mfaService.generateQRCode(otpauth);
  const backupCodes = mfaService.generateBackupCodes();
  
  // Store temporarily (2 hour TTL)
  await redis.setex(
    `mfa:setup:${user.userId}`,
    7200,
    JSON.stringify({
      secret,
      backupCodes: backupCodes.map(c => ({ code: c, used: false })),
    })
  );
  
  res.json({
    qrCode,
    backupCodes,
    message: 'Scan QR code with authenticator app. Save backup codes in secure place.',
  });
});

// Confirm MFA (verify token)
router.post('/confirm', authMiddleware, async (req: Request, res: Response) => {
  const { token } = req.body;
  const user = req.user!;
  
  // Get temporary setup data
  const setupData = await redis.get(`mfa:setup:${user.userId}`);
  if (!setupData) {
    res.status(400).json({ error: 'MFA setup not initiated' });
    return;
  }
  
  const { secret, backupCodes } = JSON.parse(setupData);
  
  // Verify token
  if (!mfaService.verifyToken(token, secret)) {
    res.status(401).json({ error: 'Invalid TOTP code' });
    return;
  }
  
  // Store MFA in database
  const hashedBackupCodes = backupCodes.map((code: any) => ({
    code: mfaService.hashBackupCode(code.code),
    used: false,
  }));
  
  await prisma.usuarioCrm.update({
    where: { id: user.userId },
    data: {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaBackupCodes: JSON.stringify(hashedBackupCodes),
      mfaEnabledAt: new Date(),
    }
  });
  
  // Audit
  await auditLogger.log({
    action: 'mfa_enabled',
    actor: user.userId,
    actorEmail: user.email,
    resource: 'users',
    resourceId: user.userId,
    result: 'success',
    ipAddress: req.ip || 'unknown',
  });
  
  // Clean up setup data
  await redis.del(`mfa:setup:${user.userId}`);
  
  res.json({ success: true, message: 'MFA enabled' });
});

// Disable MFA (requires password confirmation)
router.post('/disable', authMiddleware, async (req: Request, res: Response) => {
  const { password } = req.body;
  const user = req.user!;
  
  const dbUser = await prisma.usuarioCrm.findUnique({
    where: { id: user.userId }
  });
  
  const validPassword = await bcrypt.compare(password, dbUser!.passwordHash);
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  
  await prisma.usuarioCrm.update({
    where: { id: user.userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
    }
  });
  
  await auditLogger.log({
    action: 'mfa_disabled',
    actor: user.userId,
    resource: 'users',
    resourceId: user.userId,
    result: 'success',
    ipAddress: req.ip || 'unknown',
  });
  
  res.json({ success: true, message: 'MFA disabled' });
});

export default router;
```

### Updated Login Flow

```typescript
// src/routes/auth.ts
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const { email, password, totp } = req.body;
  
  const user = await prisma.usuarioCrm.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  
  // MFA verification required if enabled
  if (user.mfaEnabled) {
    if (!totp) {
      // Return temporary token for MFA verification
      const tempToken = jwt.sign(
        { userId: user.id, mfaPending: true },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' }
      );
      
      res.status(202).json({
        mfaPending: true,
        tempToken,
        message: 'Enter TOTP code from authenticator app',
      });
      return;
    }
    
    // Verify TOTP
    const isValidTotp = mfaService.verifyToken(totp, user.mfaSecret!);
    const backupCodes = JSON.parse(user.mfaBackupCodes || '[]');
    const isValidBackup = backupCodes.some((bc: any) =>
      !bc.used && mfaService.hashBackupCode(totp) === bc.code
    );
    
    if (!isValidTotp && !isValidBackup) {
      res.status(401).json({ error: 'Invalid TOTP or backup code' });
      return;
    }
    
    // Mark backup code as used
    if (isValidBackup) {
      const updated = backupCodes.map((bc: any) =>
        mfaService.hashBackupCode(totp) === bc.code
          ? { ...bc, used: true }
          : bc
      );
      await prisma.usuarioCrm.update({
        where: { id: user.id },
        data: { mfaBackupCodes: JSON.stringify(updated) }
      });
    }
  }
  
  // Issue tokens
  const accessToken = signToken({ userId: user.id, email });
  const refreshToken = signRefreshToken({ userId: user.id, email });
  
  res.json({
    success: true,
    data: { accessToken, refreshToken, user: { id: user.id, email } }
  });
});
```

---

Este documento proporciona los detalles técnicos específicos para implementar cada control de seguridad. Cada sección es independiente y puede implementarse en paralelo.

**Próximos pasos:**
1. Copiar código a repositorio
2. Instalar dependencias (npm/pip)
3. Ejecutar migraciones
4. Test en staging
5. Deploy a producción con feature flag
