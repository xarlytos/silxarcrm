# SECURITY REMEDIATION CHECKLIST
## Quick Reference for Engineering Team
**Updated:** June 21, 2026

---

## PHASE 1: IMMEDIATE (Week 1) ⚡

### Credentials & Secrets
- [ ] **TASK 1.1:** Revoke exposed API keys
  - [ ] MiniMax/OpenAI key (sk-cp-oHX...)
  - [ ] Gemini API key (AIzaSy...)
  - [ ] Google Places API key
  - [ ] Twilio credentials
  - [ ] Supabase service key
  - [ ] Firebase service account
  - [ ] Stripe secret key
  - [ ] Resend API key
  - [ ] Verification: Try old keys, should fail with 401/403

- [ ] **TASK 1.2:** Remove .env from git history
  ```bash
  git filter-repo --invert-paths --paths .env
  git push --force-with-lease origin --all
  ```
  - [ ] Verification: `git log --all -p -- .env` returns empty

- [ ] **TASK 1.3:** Setup AWS Secrets Manager
  - [ ] Create AWS account (or enable on existing)
  - [ ] Create secrets:
    - [ ] prod/database-url
    - [ ] prod/jwt-secret
    - [ ] prod/api-keys (JSON)
  - [ ] IAM role with GetSecretValue permission
  - [ ] Verification: Can fetch secrets via AWS CLI

- [ ] **TASK 1.4:** Update .env.example (no real secrets)
  ```bash
  # Before
  DATABASE_URL=postgresql://user:password@host:port/db
  JWT_SECRET=my-secret-123
  
  # After
  DATABASE_URL=YOUR_NEON_DATABASE_URL_HERE
  JWT_SECRET=CHANGE_ME_IN_PRODUCTION
  ```

- [ ] **TASK 1.5:** Add pre-commit hook to detect secrets
  ```bash
  npm install detect-secrets
  # .git/hooks/pre-commit will block commits with secrets
  ```

### HTTPS & TLS
- [ ] **TASK 2.1:** Enforce TLS 1.3
  - [ ] Update `backend/src/index.ts` (HSTS header)
  - [ ] Verify: `curl -I https://api.example.com | grep HSTS`

- [ ] **TASK 2.2:** Redirect HTTP → HTTPS
  - [ ] Update middleware in `backend/src/index.ts`
  - [ ] Verify: `curl -i http://api.example.com` returns 301 to https://

- [ ] **TASK 2.3:** Update CORS policy
  - [ ] Remove `http://localhost:3000` from production
  - [ ] Verify: Localhost requests return CORS error in prod

### Deployment
- [ ] **TASK 3.1:** Deploy to staging
  - [ ] Tests pass: `npm run test`
  - [ ] No errors in logs
  - [ ] Staging users can login

- [ ] **TASK 3.2:** Deploy to production
  - [ ] Announce to team: "Breaking change: .env no longer needed"
  - [ ] Monitor CloudWatch for errors
  - [ ] Rollback plan if needed

---

## PHASE 2: CORE CONTROLS (Week 2-3) 🔐

### Field-Level Encryption
- [ ] **TASK 4.1:** Implement FieldEncryption class
  - [ ] File: `backend/src/utils/encryption.ts`
  - [ ] Methods: encrypt(), decrypt(), encryptLead(), decryptLead()
  - [ ] Testing: Unit tests for roundtrip (plaintext → encrypt → decrypt → plaintext)
  - [ ] Verification: `npm run test -- encryption.test.ts`

- [ ] **TASK 4.2:** Add Prisma middleware
  - [ ] File: `backend/src/config/database.ts`
  - [ ] Auto-encrypt on CREATE/UPDATE
  - [ ] Auto-decrypt on READ
  - [ ] Testing: Verify database stores encrypted data
  - [ ] Verification: SELECT * FROM leads WHERE email LIKE 'eyJ%' (encrypted prefix)

- [ ] **TASK 4.3:** Create migration script
  - [ ] File: `scripts/migrate-field-encryption.ts`
  - [ ] Encrypt existing 100k leads
  - [ ] Batch processing (100 records at a time)
  - [ ] Rollback script in case of errors
  - [ ] Timing: ~1-2 hours for 100k records
  - [ ] Verification: All leads have encrypted email/nombre/phone

- [ ] **TASK 4.4:** Deploy migration
  - [ ] Backup database first
  - [ ] Run on staging: `npm run migrate:field-encryption --env staging`
  - [ ] Verify: Leads readable after migration
  - [ ] Run on production during low-traffic window

### Secure Logging
- [ ] **TASK 5.1:** Implement SecureLogger
  - [ ] File: `backend/src/utils/secureLogger.ts`
  - [ ] Redaction patterns: email=, phone=, password=, api_key=, token=, credit_card=
  - [ ] Testing: Try logging "email=user@example.com" → should show "email=[REDACTED]"
  - [ ] Verification: `npm run test -- secureLogger.test.ts`

- [ ] **TASK 5.2:** Implement AuditLogger
  - [ ] File: `backend/src/services/auditLogger.ts`
  - [ ] DynamoDB table: audit-logs (write-once, hash chain)
  - [ ] Events: user login, API key created, data exported, deletion
  - [ ] Retention: 1 year
  - [ ] Verification: Check DynamoDB for audit events

- [ ] **TASK 5.3:** Replace all logger calls
  - [ ] Find: `logger.info(...)`, `logger.error(...)`
  - [ ] Replace with: `secureLogger.info(...)`, `secureLogger.error(...)`
  - [ ] Files affected: ~20 service files
  - [ ] Testing: `npm run test`
  - [ ] Verification: No PII in logs

- [ ] **TASK 5.4:** Setup CloudWatch aggregation
  - [ ] Enable CloudWatch Logs Insights
  - [ ] Query: `fields @message | filter @message like /email=/` (should be empty)
  - [ ] Verify: No unredacted PII in logs

### Password Hashing
- [ ] **TASK 6.1:** Upgrade bcrypt rounds
  - [ ] File: `backend/src/routes/auth.ts`
  - [ ] Change: `bcrypt.hash(password, 10)` → `bcrypt.hash(password, 12)`
  - [ ] Add on-login upgrade: if hash.rounds < 12, rehash with new rounds
  - [ ] Testing: `npm run test -- auth.test.ts`
  - [ ] Verification: New passwords hashed with 12 rounds

- [ ] **TASK 6.2:** Test backward compatibility
  - [ ] Old password: login with user created before change
  - [ ] Verify: Old hash (rounds=10) upgraded to rounds=12 after login

### Prompt Injection Prevention
- [ ] **TASK 7.1:** Implement InputValidator
  - [ ] File: `llamadas/app/input_validator.py`
  - [ ] Methods: sanitize_for_llm(), detect_injection_patterns()
  - [ ] Patterns: "ignore instructions", "act as", "jailbreak", "override"
  - [ ] Testing: pytest for injection payload detection
  - [ ] Verification: `pytest test_input_validator.py`

- [ ] **TASK 7.2:** Integrate into chat sessions
  - [ ] File: `llamadas/app/gemini/chat_session.py`
  - [ ] Sanitize lead.nombre, lead.empresa before sending to Gemini
  - [ ] Testing: Manually test call with suspicious lead name
  - [ ] Verification: Injection attempt logged as warning

---

## PHASE 3: COMPLIANCE (Week 4-6) ⚖️

### MFA Implementation
- [ ] **TASK 8.1:** Create MFA service
  - [ ] File: `backend/src/services/mfaService.ts`
  - [ ] Methods: generateSecret(), verifyToken(), generateBackupCodes()
  - [ ] Testing: Unit tests for TOTP generation/verification
  - [ ] Verification: QR code scans successfully in Authy/Google Authenticator

- [ ] **TASK 8.2:** Add MFA routes
  - [ ] File: `backend/src/routes/mfa.ts`
  - [ ] Routes:
    - [ ] POST /mfa/setup (generate secret + QR)
    - [ ] POST /mfa/confirm (verify TOTP + store)
    - [ ] POST /mfa/disable (disable MFA)
  - [ ] Testing: E2E test for full MFA flow
  - [ ] Verification: Can enable/disable MFA without errors

- [ ] **TASK 8.3:** Update login flow
  - [ ] File: `backend/src/routes/auth.ts`
  - [ ] Modify: If mfaEnabled, require TOTP in login
  - [ ] Generate temp token (5 min TTL) if TOTP required
  - [ ] Testing: Login with MFA enabled requires 2FA
  - [ ] Verification: Can't login without valid TOTP

- [ ] **TASK 8.4:** Admin enforce MFA
  - [ ] File: `backend/src/routes/admin.ts`
  - [ ] Endpoint: POST /admin/users/:id/require-mfa
  - [ ] Behavior: Mark user.mfaRequired = true
  - [ ] On next login: User must setup MFA before accessing account

### GDPR Data Deletion
- [ ] **TASK 9.1:** Create database schema
  - [ ] Migration: `backend/prisma/migrations/add_gdpr_*.sql`
  - [ ] Tables: gdpr_erasure_requests, gdpr_audit_log
  - [ ] Columns: consentimento_* (consentimento_marketing, consentimento_llamadas)
  - [ ] Testing: `npm run migrate:dev`
  - [ ] Verification: Tables exist with correct columns

- [ ] **TASK 9.2:** Create GDPR routes
  - [ ] File: `backend/src/routes/gdpr.ts`
  - [ ] Routes:
    - [ ] POST /gdpr/erasure-request (submit)
    - [ ] POST /gdpr/erasure-request/confirm (confirm via token)
    - [ ] GET /gdpr/status/:requestId (check status)
  - [ ] Testing: E2E test for erasure flow
  - [ ] Verification: Can request erasure and confirm via email

- [ ] **TASK 9.3:** Implement erasure execution
  - [ ] Job: `backend/src/jobs/gdprErasureJob.ts`
  - [ ] Actions:
    - [ ] Anonymize leads (email → '[DELETED]', nombre → '[DELETED]')
    - [ ] Anonymize email_envios
    - [ ] Delete email_bajas
    - [ ] Delete clientes_global
  - [ ] Audit: Log all deletions to gdpr_audit_log
  - [ ] Testing: Execute erasure on test lead, verify anonymized
  - [ ] Verification: Lead data no longer identifiable

- [ ] **TASK 9.4:** Add consent tracking
  - [ ] Endpoint: POST /leads/register-with-consent
  - [ ] Body: { email, nombre, consentimientos: { marketing, llamadas, whatsapp } }
  - [ ] Validation: Reject if consentimientos.marketing = false
  - [ ] Columns: consentimento_fecha, consentimento_ip, consentimento_canal
  - [ ] Testing: Try without consent → should reject
  - [ ] Verification: New leads have consent timestamp

### RBAC Implementation
- [ ] **TASK 10.1:** Define roles & permissions
  - [ ] File: `backend/src/types/rbac.ts`
  - [ ] Roles: admin, manager, agent, viewer
  - [ ] Permissions: { resource, action, ownedOnly }
  - [ ] Verification: Type checking passes (`npm run typecheck`)

- [ ] **TASK 10.2:** Create authorize middleware
  - [ ] File: `backend/src/middleware/authorize.ts`
  - [ ] Method: authorize(resource, action, ownedOnly)
  - [ ] Logic: Check user.role has permission
  - [ ] Testing: Unit tests for each role
  - [ ] Verification: Agent user cannot access admin routes

- [ ] **TASK 10.3:** Apply to sensitive routes
  - [ ] Routes to protect:
    - [ ] POST /admin/users (admin only)
    - [ ] POST /email/campanas/lanzar (manager+)
    - [ ] DELETE /leads/:id (manager+, own leads)
    - [ ] GET /dashboard/analytics (all)
  - [ ] Testing: Try each route with wrong role → 403
  - [ ] Verification: No privilege escalation

### Rate Limiting
- [ ] **TASK 11.1:** Setup Redis-based rate limiters
  - [ ] File: `backend/src/middleware/rateLimiter.ts`
  - [ ] Limiters:
    - [ ] login: 5 req/15min per IP
    - [ ] emailCampaign: 10 req/1hour per user
    - [ ] leadImport: 1 req/day per user
    - [ ] apiKey: 1000 req/min per key
  - [ ] Testing: Hit limit, verify 429 response
  - [ ] Verification: Can't launch 11 campaigns in 1 hour

- [ ] **TASK 11.2:** Apply to routes
  - [ ] Routes:
    - [ ] POST /login (authLimiter)
    - [ ] POST /email/campanas/lanzar (emailCampaignLimiter)
    - [ ] POST /leads/import (leadImportLimiter)
  - [ ] Testing: E2E test for rate limit triggers
  - [ ] Verification: Proper 429 responses with retry-after header

---

## PHASE 4: CERTIFICATION (Week 7-12) 📋

### SOC2 Preparation
- [ ] **TASK 12.1:** Document controls
  - [ ] File: `docs/SOC2_CONTROLS.md`
  - [ ] Controls needed: CC6 (access control), CC7 (encryption), A1 (availability), etc.
  - [ ] Evidence: Policy docs, implementation details, test results
  - [ ] Verification: All 24 critical controls documented

- [ ] **TASK 12.2:** Incident response plan
  - [ ] File: `docs/INCIDENT_RESPONSE_PLAN.md`
  - [ ] Scenarios: Data breach, RCE, DoS, credential compromise
  - [ ] Timeline: Detect, contain, eradicate, recover, post-mortem
  - [ ] Contacts: On-call, escalation, legal, PR
  - [ ] Verification: Team reviews + signs off

- [ ] **TASK 12.3:** Disaster recovery testing
  - [ ] Backup restore test: Monthly
  - [ ] Failover test: Quarterly
  - [ ] Documentation: Procedures for each scenario
  - [ ] Verification: Can restore database from backup in <1 hour

### Penetration Testing
- [ ] **TASK 13.1:** Contract penetration testing firm
  - [ ] Scope: OWASP Top 10 + API testing
  - [ ] Duration: 2 weeks
  - [ ] Deliverables: Report with CVSS scores + remediation

- [ ] **TASK 13.2:** Remediate findings
  - [ ] Prioritize by CVSS score (9+ = immediate)
  - [ ] Update code based on pen test report
  - [ ] Re-test to verify fixes

---

## DEPLOYMENT CHECKLIST

### Before Each Phase Deployment

- [ ] **Code Review**
  - [ ] [ ] 2+ security engineers reviewed
  - [ ] [ ] No hardcoded secrets
  - [ ] [ ] No debug logs with PII
  - [ ] [ ] Unit tests pass: `npm run test`

- [ ] **Staging Testing**
  - [ ] [ ] Deployed to staging
  - [ ] [ ] Smoke tests pass
  - [ ] [ ] No errors in CloudWatch
  - [ ] [ ] Manual testing by QA

- [ ] **Production Deployment**
  - [ ] [ ] Feature flag (if applicable)
  - [ ] [ ] Gradual rollout (10% → 50% → 100%)
  - [ ] [ ] Monitor error rates
  - [ ] [ ] Rollback plan ready
  - [ ] [ ] Post-deployment announcement to team

### Monitoring Post-Deployment

- [ ] **Day 1:** Monitor error rates + performance
- [ ] **Week 1:** Review security logs for anomalies
- [ ] **Week 4:** Update documentation + runbooks

---

## VERIFICATION TESTS

### Security Tests (Run Before Each Deployment)

```bash
# Secrets scanning
npm run test:secrets  # Detect hardcoded secrets

# SAST (Static Analysis)
npm run lint:security  # SonarQube security rules

# Dependency scanning
npm audit  # Known vulnerabilities

# Encryption tests
npm run test -- encryption.test.ts

# Auth/MFA tests
npm run test -- auth.test.ts

# GDPR/Compliance tests
npm run test -- gdpr.test.ts
```

### Manual Penetration Tests

- [ ] **SQL Injection Test**
  - Input: `' OR '1'='1`
  - Expected: No data returned (parameterized query)

- [ ] **XSS Test**
  - Input: `<script>alert('xss')</script>`
  - Expected: Escaped or sanitized (no alert shown)

- [ ] **CSRF Test**
  - Send request without CSRF token
  - Expected: 403 Forbidden

- [ ] **Authentication Bypass**
  - JWT tampering: Change user ID in token
  - Expected: Invalid signature error

- [ ] **Authorization Bypass**
  - Agent user tries to access admin routes
  - Expected: 403 Forbidden

---

## SUCCESS CRITERIA (End of 90 Days)

### Security Metrics
- [ ] 0 secrets in git (automated check)
- [ ] 100% of sensitive data encrypted
- [ ] 0 unredacted PII in logs
- [ ] MFA enabled for 100% of admin users
- [ ] <5 min incident detection time

### Compliance Metrics
- [ ] GDPR erasure API functional and tested
- [ ] Consent tracking for 100% of new leads
- [ ] CCPA opt-out working for all users
- [ ] SOC2 initial assessment passed
- [ ] 0 critical findings on pen test

### Operational Metrics
- [ ] All security controls documented
- [ ] Team trained on security policies
- [ ] Incident response drills completed
- [ ] Security champions appointed per team
- [ ] Vulnerability disclosure policy published

---

## ESCALATION

### If blocking issue encountered:

1. **Severity 1 (Critical):** Page on-call security engineer immediately
2. **Severity 2 (High):** Schedule meeting within 4 hours
3. **Severity 3 (Medium):** Add to next sprint planning

### Decision owners:

- **Technical:** CTO
- **Compliance:** Chief Legal Officer
- **Timeline/scope changes:** VP Engineering + Security Lead

---

## RESOURCES

- **Full Audit Report:** `SECURITY_AUDIT_REPORT.md` (30 pages)
- **Implementation Specs:** `SECURITY_IMPLEMENTATION_SPECS.md` (50 pages)
- **Executive Summary:** `EXECUTIVE_SUMMARY_SECURITY.md` (Board-level)
- **Code Examples:** Available in all spec docs above

---

**Last Updated:** June 21, 2026  
**Next Review:** September 20, 2026 (90-day checkpoint)  
**Questions?** Contact: security@company.com
