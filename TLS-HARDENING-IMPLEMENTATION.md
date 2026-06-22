# HTTPS/TLS Hardening Configuration Guide

Complete guide to implement HTTPS/TLS hardening with certificate pinning and rate limiting for the CRM Maestro API.

## Table of Contents

1. [Overview](#overview)
2. [Express.js Middleware](#expressjs-middleware)
3. [Nginx Configuration](#nginx-configuration)
4. [Certificate Management](#certificate-management)
5. [Certificate Pinning Setup](#certificate-pinning-setup)
6. [Rate Limiting Configuration](#rate-limiting-configuration)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)
9. [Production Checklist](#production-checklist)

---

## Overview

This hardening configuration provides:

- **TLS 1.3 Enforcement**: Modern TLS version only (backward compatible option available)
- **HSTS Headers**: Strict-Transport-Security with 1-year max-age and preload
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy
- **Certificate Pinning**: Public key pinning for external APIs (OpenAI, ElevenLabs, Google)
- **Rate Limiting**: 100 req/min per IP globally, 10 req/15min for auth endpoints
- **Advanced CSP**: Comprehensive Content Security Policy preventing XSS/injection attacks

**Key Files Created**:
- `/backend/src/middleware/tlsHardening.ts` - Express.js middleware stack
- `/nginx.conf` - Production Nginx configuration
- `/TLS-HARDENING-IMPLEMENTATION.md` - This guide (implementation docs)

---

## Express.js Middleware

### Location
`/backend/src/middleware/tlsHardening.ts`

### Exported Functions

#### 1. `enforceTLS13`
Middleware that validates TLS version on incoming connections.

```typescript
import { enforceTLS13 } from './middleware/tlsHardening';

app.use(enforceTLS13); // Reject non-TLS 1.3 connections
```

**Behavior**:
- Checks socket `tlsVersion` property
- Returns 400 error if TLS version < 1.3
- Passes through on TLS 1.3 connections

**Response on Failure**:
```json
{
  "error": "TLS 1.3 required",
  "message": "This API requires TLS 1.3 or higher. Please upgrade your client.",
  "current": "TLSv1.2"
}
```

#### 2. `hstsHeader`
Adds Strict-Transport-Security header to enforce HTTPS.

```typescript
app.use(hstsHeader);
```

**Header Set**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Effects**:
- Browser enforces HTTPS for 1 year (31,536,000 seconds)
- Applies to all subdomains
- Eligible for HSTS preload list inclusion

#### 3. `securityHeaders`
Applies comprehensive security headers to all responses.

```typescript
app.use(securityHeaders);
```

**Headers Applied**:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME-type sniffing |
| X-XSS-Protection | 1; mode=block | Legacy XSS filter |
| Content-Security-Policy | (see CSP section) | Prevent XSS/injection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer leak |
| Permissions-Policy | camera=(), microphone=(), ... | Restrict powerful APIs |

**Content Security Policy Details**:
```
default-src 'self'                    # Only same-origin by default
script-src 'self' 'unsafe-inline'     # Scripts from self (adjust as needed)
style-src 'self' 'unsafe-inline'      # CSS from self
img-src 'self' data: https:           # Images from self, data URIs, HTTPS
font-src 'self' data:                 # Fonts from self
connect-src 'self' https://api.openai.com ...  # External API connections
frame-ancestors 'none'                # No framing allowed
form-action 'self'                    # Forms submit to same-origin only
base-uri 'self'                       # Base tag href same-origin
upgrade-insecure-requests             # Auto-upgrade HTTP to HTTPS
```

#### 4. `createAdvancedRateLimiter([redisClient])`
Creates a configurable rate limiter (100 req/min per IP).

```typescript
import { createAdvancedRateLimiter } from './middleware/tlsHardening';

// Memory store (single instance)
app.use('/api', createAdvancedRateLimiter());

// Redis store (distributed)
const redis = require('ioredis');
const client = new redis(process.env.REDIS_URL);
app.use('/api', createAdvancedRateLimiter(client));
```

**Configuration**:
- **Window**: 60 seconds
- **Max**: 100 requests per window per IP
- **Burst**: 20 additional requests allowed (burst mode)
- **Skipped Paths**: `/health`, `/webhooks/*`, `/api/events`

**Response on Limit Exceeded**:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded: 100 requests per minute per IP",
  "retryAfter": 60,
  "ip": "192.168.1.100"
}
```

#### 5. `createAuthRateLimiter([redisClient])`
Stricter rate limiter for authentication endpoints (10 req/15min).

```typescript
import { createAuthRateLimiter } from './middleware/tlsHardening';

// Apply to auth routes only
app.use('/api/auth', createAuthRateLimiter());
```

**Configuration**:
- **Window**: 15 minutes (900 seconds)
- **Max**: 10 requests per window per IP
- **Burst**: 5 additional requests allowed

**Response on Limit Exceeded**:
```json
{
  "error": "Too many login attempts",
  "message": "Rate limit exceeded: 10 requests per 15 minutes",
  "retryAfter": 900
}
```

### Integration in Express App

```typescript
// Already integrated in `/backend/src/index.ts`

// 1. Apply TLS hardening stack
app.use(...tlsHardeningStack);

// 2. Apply rate limiting
app.use('/api', createAdvancedRateLimiter());

// 3. All responses will include security headers
// 4. All API requests are rate limited
// 5. TLS 1.3 is enforced (when behind nginx with proper TLS config)
```

---

## Nginx Configuration

### Location
`/nginx.conf`

### Setup Instructions

1. **Copy to Nginx Directory**:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/crm-api
sudo ln -s /etc/nginx/sites-available/crm-api /etc/nginx/sites-enabled/crm-api
```

2. **Verify Syntax**:
```bash
sudo nginx -t
```

3. **Reload Nginx**:
```bash
sudo systemctl reload nginx
```

### Key Sections

#### SSL/TLS Configuration

```nginx
# TLS 1.3 ONLY (most secure)
ssl_protocols TLSv1.3;

# For backward compatibility:
# ssl_protocols TLSv1.3 TLSv1.2;

# Cipher suites
ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;

# Perfect Forward Secrecy (PFS)
ssl_ecdh_curve X25519:P-256:P-384;

# Session management
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;
ssl_session_tickets off;  # Disable resumption for security
```

#### HSTS Header

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**Progressive Approach** (recommended for first deployment):
1. Start with short max-age for testing:
   ```
   max-age=3600  # 1 hour
   ```
2. Increase to 1 month after validation:
   ```
   max-age=2592000
   ```
3. Finally set to 1 year:
   ```
   max-age=31536000
   ```

#### Certificate Pinning

```nginx
add_header Public-Key-Pins 'pin-sha256="..."; pin-sha256="..."; max-age=60; includeSubDomains' always;
```

⚠️ **WARNING**: Only enable after thorough testing with correct pins. Incorrect pins will lock users out.

**Generating Pins** (see Certificate Pinning Setup section below).

#### Rate Limiting Configuration

```nginx
# Zone definitions
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

# Apply to routes
location /api/auth/ {
    limit_req zone=auth_limit burst=5 nodelay;
    ...
}

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    ...
}
```

**Parameters**:
- `$binary_remote_addr`: IP address key
- `zone=NAME:10m`: 10MB shared memory zone
- `rate=100r/m`: 100 requests per minute
- `burst=20`: Allow 20 extra requests in spike
- `nodelay`: Process burst immediately (vs queue)

#### Security Headers

All major security headers are configured:

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), ..." always;

add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://api.openai.com https://api.elevenlabs.io ...;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    upgrade-insecure-requests;
" always;
```

#### Proxy Configuration

```nginx
location /api/ {
    proxy_pass http://crm_maestro_backend;
    
    # Preserve client information
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $server_name;
    
    # Performance settings
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering on;
    proxy_buffer_size 4k;
}
```

---

## Certificate Management

### Obtain SSL Certificates

#### Option 1: Let's Encrypt (Recommended)

```bash
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --webroot -w /var/www/certbot -d api.ervok.com

# Auto-renew (adds cron job)
sudo certbot renew --dry-run
```

**Nginx Configuration** (Let's Encrypt):
```nginx
ssl_certificate /etc/letsencrypt/live/api.ervok.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.ervok.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/api.ervok.com/chain.pem;
```

#### Option 2: Self-Signed Certificate (Testing Only)

```bash
# Generate self-signed cert (365 days)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Copy to Nginx
sudo cp cert.pem /etc/nginx/ssl/
sudo cp key.pem /etc/nginx/ssl/
sudo chmod 400 /etc/nginx/ssl/key.pem
```

### Certificate Verification

```bash
# Check certificate details
openssl x509 -in cert.pem -text -noout

# Verify expiry
openssl x509 -in cert.pem -noout -enddate

# Test TLS configuration
openssl s_client -connect api.ervok.com:443 -tls1_3
```

### Certificate Chain Validation

```bash
# Verify certificate chain
openssl verify -CAfile chain.pem cert.pem

# Check intermediate certs
openssl x509 -in chain.pem -text -noout
```

---

## Certificate Pinning Setup

### Public Key Pin Generation

Certificate pinning provides additional security by verifying the exact certificate (or issuer) used by external APIs.

#### Step 1: Get the Certificate

```bash
# For ElevenLabs API
openssl s_client -connect api.elevenlabs.io:443 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

**Output Example**:
```
9Z6xpKTlP4PeFnQBtKhgQ8qpH7OO9kAq5L1dF7wDhzA=
```

#### Step 2: Get Backup Pin (Issuer CA)

```bash
# Get the issuer certificate (for backup pin)
openssl s_client -connect api.elevenlabs.io:443 -showcerts < /dev/null 2>/dev/null | \
  sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' | \
  tail -1 | openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

#### Step 3: Update Configuration

**In Nginx**:
```nginx
add_header Public-Key-Pins 'pin-sha256="9Z6xpKTlP4PeFnQBtKhgQ8qpH7OO9kAq5L1dF7wDhzA="; pin-sha256="abc123def456..."; max-age=60; includeSubDomains' always;
```

**In Express.js** (`tlsHardening.ts`):
```typescript
export const certificatePinMap: Record<string, string[]> = {
  'api.elevenlabs.io': [
    'pin-sha256="9Z6xpKTlP4PeFnQBtKhgQ8qpH7OO9kAq5L1dF7wDhzA="',
    'pin-sha256="abc123def456ghi789jkl012mno345pqr678stuv=="',
  ],
};
```

### APIs to Pin

#### 1. OpenAI API (GPT Models)
```bash
openssl s_client -connect api.openai.com:443 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -noout -pubkey | openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | openssl enc -base64
```

#### 2. ElevenLabs API (Text-to-Speech)
```bash
openssl s_client -connect api.elevenlabs.io:443 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -noout -pubkey | openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | openssl enc -base64
```

#### 3. Google APIs (Gemini, Places)
```bash
openssl s_client -connect generativelanguage.googleapis.com:443 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -noout -pubkey | openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | openssl enc -base64
```

### Certificate Pinning Testing

```bash
# Test pin with curl (will fail if pin doesn't match)
curl -i --pin "sha256/9Z6xpKTlP4PeFnQBtKhgQ8qpH7OO9kAq5L1dF7wDhzA=" \
  https://api.elevenlabs.io/status

# Check HTTP Public-Key-Pins header response
curl -i https://api.ervok.com/health | grep -i public-key-pins
```

---

## Rate Limiting Configuration

### Memory Store (Single Instance)

For single-server deployments:

```typescript
// index.ts
import { createAdvancedRateLimiter } from './middleware/tlsHardening';

app.use('/api', createAdvancedRateLimiter());
```

**Limitations**:
- Each instance has separate rate limit counter
- Not suitable for load-balanced deployments
- Limited to available server RAM

### Redis Store (Distributed)

For multiple servers or containerized deployments:

```typescript
// index.ts
import IORedis from 'ioredis';
import { createAdvancedRateLimiter } from './middleware/tlsHardening';

const redis = new IORedis(process.env.REDIS_URL);

app.use('/api', createAdvancedRateLimiter(redis));
```

**Environment Variable**:
```env
REDIS_URL=redis://localhost:6379
# Or with password: redis://:password@localhost:6379
# Or Upstash: redis://default:token@endpoint:port
```

### Rate Limit Exemptions

Certain endpoints are automatically exempted from rate limiting:

```typescript
// Exempted paths (in tlsHardening.ts)
skip: (req: Request) => {
  return (
    req.path === '/health' ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/api/events')
  );
}
```

**To add more exemptions**, edit the `skip` function:

```typescript
skip: (req: Request) => {
  return (
    req.path === '/health' ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/api/events') ||
    req.path === '/api/status' ||           // Add new
    req.path.startsWith('/api/public')      // Add new
  );
}
```

### Custom Rate Limit Zones (Nginx)

Add stricter limits for specific endpoints:

```nginx
# In nginx.conf
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=mail_limit:10m rate=5r/m;

location /api/uploads/ {
    limit_req zone=upload_limit burst=3 nodelay;
    ...
}

location /api/email/ {
    limit_req zone=mail_limit burst=2 nodelay;
    ...
}
```

### Monitoring Rate Limits

**Nginx Logs**:
```bash
# View rate limit rejections
grep "limiting requests" /var/log/nginx/error.log

# Count rate limit hits
grep "limiting requests" /var/log/nginx/error.log | wc -l
```

**Redis Keys** (for distributed rate limiting):
```bash
redis-cli
> KEYS "rl:*"          # Show all rate limit keys
> TTL rl:192.168.1.1   # Check expiry
```

---

## Testing & Validation

### 1. Test TLS 1.3 Enforcement

```bash
# Should work (TLS 1.3)
curl -i --tlsv1.3 https://api.ervok.com/health

# Test TLS 1.2 rejection (if enforced)
curl -i --tlsv1.2 https://api.ervok.com/health
# Expected: Connection refused or protocol error
```

### 2. Test Security Headers

```bash
# Check all security headers
curl -i https://api.ervok.com/health | grep -E "X-Frame|X-Content|HSTS|CSP|X-XSS"

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Content-Security-Policy: ...
```

### 3. Test HSTS Preload

```bash
# Submit to HSTS preload list
# https://hstspreload.org/
# Paste domain to verify it's eligible
```

### 4. Rate Limit Testing

```bash
# Test 100 req/min limit
for i in {1..105}; do
  curl -s -o /dev/null -w "%{http_code} " https://api.ervok.com/api/test
done

# Expected: 100 200s, then 5 429s (rate limited)
```

**Detailed Test**:
```bash
#!/bin/bash
echo "Testing rate limiting (100 req/min)..."
success=0
blocked=0

for i in {1..110}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" https://api.ervok.com/api/test)
  if [ "$status" = "200" ]; then
    ((success++))
  elif [ "$status" = "429" ]; then
    ((blocked++))
  fi
  echo -ne "\rSuccess: $success, Blocked: $blocked, Total: $i"
done
echo ""
echo "Rate limiting working: $([[ $blocked -gt 0 ]] && echo 'YES' || echo 'NO')"
```

### 5. Certificate Pinning Validation

```bash
# Download ElevenLabs certificate
openssl s_client -connect api.elevenlabs.io:443 -showcerts < /dev/null 2>/dev/null > /tmp/elevenlabs.pem

# Extract and verify pin
cat /tmp/elevenlabs.pem | openssl x509 -noout -pubkey | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | openssl enc -base64

# Compare with configured pin in nginx.conf
```

### 6. CSP Validation

```bash
# Test CSP with CSP violation reporting
curl -i -H "Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report" \
  https://api.ervok.com/api/test

# Verify CSP header present
curl -i https://api.ervok.com/api/test | grep -i content-security-policy
```

### 7. SSL Labs A+ Test

```bash
# Test your TLS configuration
# https://www.ssllabs.com/ssltest/analyze.html?d=api.ervok.com
```

**Expected Results**:
- Overall Grade: A+
- TLS 1.3: Yes
- TLS 1.2: No (if enforced TLS 1.3 only)
- Forward Secrecy: Yes
- HSTS: Yes

---

## Troubleshooting

### Issue: "TLS 1.3 required" errors

**Cause**: Client using TLS 1.2 or older

**Solutions**:
1. Update client to TLS 1.3 support
2. Disable TLS 1.3 enforcement temporarily:
   ```nginx
   ssl_protocols TLSv1.3 TLSv1.2;
   ```
3. Use conditional enforcement based on endpoint

### Issue: Certificate pinning locks out users

**Cause**: Pin mismatch due to certificate rotation

**Solutions**:
1. **Add backup pin** (issuer CA certificate):
   ```nginx
   pin-sha256="primary_pin"; pin-sha256="issuer_pin"; pin-sha256="backup_pin"
   ```
2. **Use short max-age during testing**:
   ```nginx
   max-age=60  # 1 minute instead of 30 days
   ```
3. **Disable HPKP** temporarily:
   ```nginx
   # Comment out Public-Key-Pins header
   # add_header Public-Key-Pins ...;
   ```

### Issue: Rate limit blocking legitimate traffic

**Cause**: Burst too low or shared IP addresses

**Solutions**:
1. Increase burst allowance:
   ```nginx
   limit_req zone=api_limit burst=50 nodelay;  # Was 20
   ```
2. Whitelist trusted IPs:
   ```nginx
   geo $whitelist {
     default 0;
     192.168.1.0/24 1;
     10.0.0.0/8 1;
   }
   
   if ($whitelist) { set $bypass 1; }
   limit_req_status 429;
   ```
3. Exempt specific paths:
   ```nginx
   location /api/webhook-handler {
     limit_req off;  # Disable for this location
   }
   ```

### Issue: CSP blocking resources

**Cause**: Resource domain not in CSP allow list

**Solutions**:
1. Check browser console for CSP violations
2. Add domain to CSP:
   ```nginx
   connect-src 'self' https://api.example.com https://api.another.com;
   ```
3. Use report-only mode for testing:
   ```nginx
   add_header Content-Security-Policy-Report-Only "..." always;
   ```

### Issue: CORS errors with CSP

**Cause**: CORS origins not in CSP connect-src

**Solutions**:
1. Add all CORS origins to CSP:
   ```nginx
   connect-src 'self' https://app.ervok.com https://crmpropio.vercel.app;
   ```
2. Verify CORS and CSP are aligned

### Issue: Nginx won't reload

**Diagnosis**:
```bash
sudo nginx -t  # Check syntax
```

**Common Errors**:
- Missing semicolon at end of directive
- Unclosed quotes in header values
- Duplicate server blocks

---

## Production Checklist

Before deploying to production, verify:

### Security Configuration
- [ ] TLS version set to 1.3 (or 1.3 + 1.2 for compatibility)
- [ ] HSTS header configured with 1-year max-age
- [ ] All security headers present (X-Frame, CSP, etc.)
- [ ] CSP policy reviewed and tested
- [ ] Certificate pinning pins updated (if using)
- [ ] Certificate chain complete and validated

### Rate Limiting
- [ ] Rate limiter enabled on /api endpoints
- [ ] Auth endpoints have stricter limits
- [ ] Webhook endpoints bypassed from limiting
- [ ] Redis (if distributed) is configured
- [ ] Rate limit zones match Nginx config

### Certificates
- [ ] SSL certificate installed and valid
- [ ] Certificate doesn't expire in < 30 days
- [ ] Certificate chain includes intermediates
- [ ] Key permissions set to 400 (read-only)
- [ ] Auto-renewal configured (if Let's Encrypt)

### Nginx
- [ ] Config syntax validates: `sudo nginx -t`
- [ ] Server reloads without errors: `sudo systemctl reload nginx`
- [ ] Nginx user has read permissions on cert files
- [ ] Gzip compression enabled
- [ ] Client body size limit set appropriately

### Monitoring & Logging
- [ ] Nginx error log monitored for TLS errors
- [ ] Rate limit rejections logged
- [ ] Certificate expiry alerts configured
- [ ] Health check endpoint accessible
- [ ] Logs rotated (logrotate configured)

### Testing
- [ ] TLS 1.3 enforced: `openssl s_client -tls1_3 ...`
- [ ] Security headers present: `curl -i https://... | grep X-`
- [ ] Rate limiting working: Send 120 requests
- [ ] HTTPS redirect working: `curl -i http://...`
- [ ] API responds correctly: `curl https://api/test`
- [ ] SSL Labs grade: A+ (https://ssllabs.com)

### Environment
- [ ] TLS_ENABLED=true in env
- [ ] Port 443 open in firewall
- [ ] Port 80 open (for ACME renewal)
- [ ] Systemd service auto-restart on crash
- [ ] Backups of certificates configured

### Documentation
- [ ] Certificate pinning pins documented
- [ ] Emergency procedures documented
- [ ] On-call rotation includes TLS troubleshooting
- [ ] Incident response plan for certificate expiry

---

## Quick Reference Commands

### Certificate Management
```bash
# Check cert expiry
openssl x509 -in /path/to/cert.pem -noout -enddate

# Verify cert matches key
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5

# Renew Let's Encrypt
sudo certbot renew --force-renewal

# Generate HPKP pin
openssl x509 -noout -pubkey -in cert.pem | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | openssl enc -base64
```

### Nginx Operations
```bash
# Test config
sudo nginx -t

# Reload (graceful)
sudo systemctl reload nginx

# Full restart
sudo systemctl restart nginx

# View error log
sudo tail -f /var/log/nginx/error.log

# View rate limit rejections
sudo grep "limiting requests" /var/log/nginx/error.log
```

### Testing
```bash
# Test TLS 1.3
curl -v --tlsv1.3 https://api.ervok.com/health

# Check headers
curl -i https://api.ervok.com/health

# Rate limit test
for i in {1..110}; do curl -s -o /dev/null -w "%{http_code}\n" https://api.ervok.com/api/test; done

# Check HSTS
curl -i https://api.ervok.com/health | grep -i strict
```

---

## References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Preload](https://hstspreload.org/)
- [RFC 7469 - Public Key Pinning](https://tools.ietf.org/html/rfc7469)
- [Nginx TLS Configuration](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
