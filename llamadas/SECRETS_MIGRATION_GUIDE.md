# AWS Secrets Manager Migration Guide

Complete guide for migrating environment variables to AWS Secrets Manager with automatic 30-day rotation.

## Overview

This migration replaces environment variable-based credential management with AWS Secrets Manager, providing:

- **Centralized secret storage** with encryption at rest
- **Automatic 30-day rotation** via Lambda function
- **Audit logging** of all secret access and changes
- **Access control** via IAM policies
- **Backward compatibility** with environment variable fallback

## Extracted Environment Variables

All secrets from `config.py`:

### API Keys & Credentials (13 secrets)

| Environment Variable | Secrets Manager Path | Service | Type |
|---|---|---|---|
| GEMINI_API_KEY | `silxarcrm/gemini/api-key` | Google Gemini | API Key |
| ELEVENLABS_API_KEY | `silxarcrm/elevenlabs/api-key` | ElevenLabs | API Key |
| TWILIO_ACCOUNT_SID | `silxarcrm/twilio/account-sid` | Twilio | Account ID |
| TWILIO_AUTH_TOKEN | `silxarcrm/twilio/auth-token` | Twilio | Auth Token |
| TWILIO_FROM_NUMBER | `silxarcrm/twilio/from-number` | Twilio | Phone Number |
| CALCOM_API_KEY | `silxarcrm/calcom/api-key` | Cal.com | API Key |
| SLACK_WEBHOOK_URL | `silxarcrm/slack/webhook-url` | Slack | Webhook URL |
| PAGERDUTY_INTEGRATION_KEY | `silxarcrm/pagerduty/integration-key` | PagerDuty | Integration Key |
| REDIS_URL | `silxarcrm/redis/url` | Redis | Connection URL |
| DATABASE_URL | `silxarcrm/database/url` | PostgreSQL | Connection URL |
| SUPABASE_URL | `silxarcrm/supabase/url` | Supabase | Project URL |
| SUPABASE_SERVICE_KEY | `silxarcrm/supabase/service-key` | Supabase | Service Key |
| BACKEND_WEBHOOK_URL | `silxarcrm/webhook/backend-url` | Express Backend | Webhook URL |
| BACKEND_WEBHOOK_SECRET | `silxarcrm/webhook/backend-secret` | Express Backend | Secret |
| VOICE_CONFIG_API_KEY | `silxarcrm/voice-config/api-key` | Voice Config API | API Key |

## Migration Steps

### Phase 1: Preparation (No Downtime)

#### 1.1 Verify Prerequisites

```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify region
export AWS_REGION=us-east-1
aws secretsmanager list-secrets --region $AWS_REGION

# Check current .env file
test -f .env && echo "✓ .env exists" || echo "✗ .env not found"
```

#### 1.2 Install Dependencies

```bash
pip install boto3 pydantic-settings
```

#### 1.3 Export Current Secrets

```bash
python llamadas/app/migration_secrets.py \
  --action export \
  --env-file .env \
  --backup-file secrets_backup.json
```

**Output:**
- `secrets_backup.json` created with all current secrets
- Console output showing exported variables

**Security Note:** Keep `secrets_backup.json` encrypted and secure. This is a backup only.

### Phase 2: Create AWS Resources

#### 2.1 Create KMS Key (optional, recommended)

```bash
aws kms create-key \
  --description "SilxaCRM Secrets encryption key" \
  --origin AWS_KMS \
  --region us-east-1
```

Save the key ARN for later use.

#### 2.2 Create IAM Policy for Application

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSecrets",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT-ID:secret:silxarcrm/*"
    },
    {
      "Sid": "DecryptSecrets",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT-ID:key/KEY-ID"
    }
  ]
}
```

Attach this policy to the IAM role/user running the application.

#### 2.3 Create Lambda Execution Role

```bash
# Trust policy for Lambda
cat > lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name silxarcrm-secrets-rotation-role \
  --assume-role-policy-document file://lambda-trust-policy.json

# Attach policy for secrets rotation
aws iam attach-role-policy \
  --role-name silxarcrm-secrets-rotation-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Add policy for Secrets Manager
cat > lambda-secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue",
        "secretsmanager:PutSecretValue",
        "secretsmanager:UpdateSecretVersionStage"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT-ID:secret:silxarcrm/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name silxarcrm-secrets-rotation-role \
  --policy-name silxarcrm-secrets-rotation-policy \
  --policy-document file://lambda-secrets-policy.json
```

### Phase 3: Deploy Lambda Rotation Function

#### 3.1 Prepare Lambda Deployment Package

```bash
cd llamadas/app

# Create deployment directory
mkdir -p lambda-deployment
cp lambda_rotation.py lambda-deployment/

# Create requirements.txt
cat > lambda-deployment/requirements.txt <<EOF
boto3>=1.26.0
EOF

# Install dependencies
pip install -r lambda-deployment/requirements.txt -t lambda-deployment/

# Create deployment package
cd lambda-deployment
zip -r ../lambda-rotation.zip .
cd ..
```

#### 3.2 Deploy Lambda Function

```bash
LAMBDA_ARN=$(aws lambda create-function \
  --function-name silxarcrm-secrets-rotation \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT-ID:role/silxarcrm-secrets-rotation-role \
  --handler lambda_rotation.lambda_handler \
  --zip-file fileb://lambda-rotation.zip \
  --timeout 300 \
  --environment Variables="{LOG_LEVEL=INFO}" \
  --region us-east-1 \
  --query 'FunctionArn' \
  --output text)

echo "Lambda ARN: $LAMBDA_ARN"
```

#### 3.3 Add Lambda Permissions

```bash
aws lambda add-permission \
  --function-name silxarcrm-secrets-rotation \
  --action lambda:InvokeFunction \
  --principal secretsmanager.amazonaws.com \
  --region us-east-1
```

### Phase 4: Import Secrets to Secrets Manager

#### 4.1 Import All Secrets

```bash
python llamadas/app/migration_secrets.py \
  --action import \
  --region us-east-1
```

**Output:** 15 secrets created in AWS Secrets Manager

#### 4.2 Verify Import

```bash
python llamadas/app/migration_secrets.py \
  --action verify \
  --region us-east-1
```

Expected output:
```
✓ silxarcrm/gemini/api-key
✓ silxarcrm/elevenlabs/api-key
✓ silxarcrm/twilio/account-sid
... (all 15 secrets)
Verification complete: 15/15 secrets accessible
```

### Phase 5: Configure Automatic Rotation

#### 5.1 Setup 30-Day Rotation

```bash
python llamadas/app/migration_secrets.py \
  --action setup-rotation \
  --lambda-arn arn:aws:lambda:us-east-1:ACCOUNT-ID:function:silxarcrm-secrets-rotation \
  --rotation-days 30 \
  --region us-east-1
```

#### 5.2 Verify Rotation Configuration

```bash
aws secretsmanager describe-secret \
  --secret-id silxarcrm/gemini/api-key \
  --region us-east-1 \
  --query 'RotationRules'
```

Expected output:
```json
{
  "AutomaticallyAfterDays": 30,
  "Duration": 3,
  "ScheduleExpression": "rate(30 days)"
}
```

### Phase 6: Update Application Code

#### 6.1 Install SecretManager in Application

Copy the following files to your application:

- `secrets_manager.py` - Core SecretManager class
- `config_secrets.py` - Updated config with Secrets Manager integration
- `lambda_rotation.py` - Rotation handler (for AWS Lambda)
- `migration_secrets.py` - Migration utilities

#### 6.2 Update Application Initialization

**Before (using environment variables):**
```python
from llamadas.app.config import get_settings
settings = get_settings()
```

**After (using Secrets Manager):**
```python
from llamadas.app.config_secrets import get_settings
settings = get_settings()  # Automatically fetches from Secrets Manager
```

#### 6.3 Configuration Environment Variables

Add to your deployment environment:

```bash
# Enable Secrets Manager
export AWS_REGION=us-east-1
export SECRETS_MANAGER_FALLBACK=true  # Fall back to env vars if secret not found

# Optional: Custom cache TTL (seconds)
# export SECRETS_MANAGER_CACHE_TTL=3600
```

### Phase 7: Testing & Validation

#### 7.1 Test Secret Retrieval

```python
from llamadas.app.secrets_manager import get_secret_manager

manager = get_secret_manager(region="us-east-1")

# Test retrieving a secret
api_key = manager.get_secret("silxarcrm/gemini/api-key", env_fallback="GEMINI_API_KEY")
print(f"Retrieved API key: {api_key[:20]}...")
```

#### 7.2 Test in Staging Environment

```bash
# Deploy to staging with Secrets Manager enabled
docker run \
  -e AWS_REGION=us-east-1 \
  -e SECRETS_MANAGER_FALLBACK=true \
  -v ~/.aws/credentials:/root/.aws/credentials \
  silxarcrm-voice:latest
```

#### 7.3 Monitor Secret Access

```bash
# View CloudTrail logs for secret access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --region us-east-1 \
  --max-results 10
```

### Phase 8: Production Deployment

#### 8.1 Pre-Deployment Checklist

- [ ] All 15 secrets verified in AWS Secrets Manager
- [ ] Lambda rotation function deployed and tested
- [ ] Rotation configured for 30-day cycle
- [ ] IAM policies attached to application role
- [ ] Application code updated to use SecretManager
- [ ] Staging environment tested successfully
- [ ] Backup of original .env secured and encrypted
- [ ] CloudTrail logging enabled for audit

#### 8.2 Deployment Steps

```bash
# 1. Deploy updated application code
git pull origin main
docker build -t silxarcrm-voice:3.1.0 .
docker push silxarcrm-voice:3.1.0

# 2. Update deployment with new image
kubectl set image deployment/silxarcrm-voice \
  silxarcrm-voice=silxarcrm-voice:3.1.0

# 3. Remove .env from running containers
# (Secrets Manager will be used instead)

# 4. Verify application is running
kubectl logs deployment/silxarcrm-voice | tail -20
```

#### 8.3 Rollback Plan

If issues occur:

```bash
# Rollback to previous image
kubectl set image deployment/silxarcrm-voice \
  silxarcrm-voice=silxarcrm-voice:3.0.0

# Restore .env from backup (if needed)
cp secrets_backup.json .env
# Convert JSON to .env format if needed
```

## Secret Rotation Schedule

### 30-Day Rotation Cycle

| Secret Category | Schedule | Reason | Action |
|---|---|---|---|
| API Keys | Every 30 days | Industry standard | Auto-rotated by Lambda |
| Database Credentials | Every 30 days | Database security | Auto-rotated by Lambda |
| Auth Tokens | Every 30 days | Token expiration risk | Auto-rotated by Lambda |
| Webhook Secrets | Every 30 days | Request validation | Auto-rotated by Lambda |

### Rotation Timeline

```
Day 1:  Rotation scheduled
Day 0:  Lambda function triggered
        1. Generate new credential
        2. Store as AWSPENDING version
        3. Test with external service
Day 1:  Finalize rotation (promote to AWSCURRENT)
        Application automatically uses new credential
        Old version marked as AWSPREVIOUS
```

### Monitoring Rotations

```bash
# View rotation history
aws secretsmanager describe-secret \
  --secret-id silxarcrm/gemini/api-key \
  --query 'VersionIdsToStages' \
  --region us-east-1

# Check rotation failures
aws logs tail /aws/lambda/silxarcrm-secrets-rotation --follow

# Set up CloudWatch alarm
aws cloudwatch put-metric-alarm \
  --alarm-name silxarcrm-secrets-rotation-failures \
  --alarm-description "Alert on secret rotation failures" \
  --metric-name RotationFailure \
  --namespace AWS/SecretsManager \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT-ID:alerts
```

## Secrets Mapping Reference

Complete mapping of all 15 secrets:

```
GEMINI_API_KEY                    → silxarcrm/gemini/api-key
ELEVENLABS_API_KEY                → silxarcrm/elevenlabs/api-key
TWILIO_ACCOUNT_SID                → silxarcrm/twilio/account-sid
TWILIO_AUTH_TOKEN                 → silxarcrm/twilio/auth-token
TWILIO_FROM_NUMBER                → silxarcrm/twilio/from-number
CALCOM_API_KEY                    → silxarcrm/calcom/api-key
SLACK_WEBHOOK_URL                 → silxarcrm/slack/webhook-url
PAGERDUTY_INTEGRATION_KEY         → silxarcrm/pagerduty/integration-key
REDIS_URL                         → silxarcrm/redis/url
DATABASE_URL                      → silxarcrm/database/url
SUPABASE_URL                      → silxarcrm/supabase/url
SUPABASE_SERVICE_KEY              → silxarcrm/supabase/service-key
BACKEND_WEBHOOK_URL               → silxarcrm/webhook/backend-url
BACKEND_WEBHOOK_SECRET            → silxarcrm/webhook/backend-secret
VOICE_CONFIG_API_KEY              → silxarcrm/voice-config/api-key
```

## Troubleshooting

### Issue: "ResourceNotFoundException" when fetching secrets

**Cause:** Secret not created or wrong region

**Solution:**
```bash
# Verify secret exists
aws secretsmanager describe-secret \
  --secret-id silxarcrm/gemini/api-key \
  --region us-east-1

# Create if missing
aws secretsmanager create-secret \
  --name silxarcrm/gemini/api-key \
  --secret-string "your-api-key" \
  --region us-east-1
```

### Issue: Rotation fails with permission error

**Cause:** Lambda role missing permissions

**Solution:**
```bash
# Verify Lambda role has correct policy
aws iam get-role-policy \
  --role-name silxarcrm-secrets-rotation-role \
  --policy-name silxarcrm-secrets-rotation-policy

# Update policy with correct ARNs
aws iam put-role-policy \
  --role-name silxarcrm-secrets-rotation-role \
  --policy-name silxarcrm-secrets-rotation-policy \
  --policy-document file://lambda-secrets-policy.json
```

### Issue: Application still reads from .env instead of Secrets Manager

**Cause:** Using old config module

**Solution:**
```python
# Update imports
from llamadas.app.config_secrets import get_settings  # ← Use config_secrets
settings = get_settings()
```

## Cost Estimation

### AWS Secrets Manager Pricing

| Component | Unit | Cost |
|---|---|---|
| Stored Secret | per secret/month | $0.40 |
| API Call | per 10,000 calls | $0.05 |
| Rotation | included | free |

**Monthly Cost Example (15 secrets + rotation):**
- 15 secrets × $0.40 = $6.00
- 10,000 API calls × ($0.05/10k) = $0.50
- **Total: ~$6.50/month**

### Additional Costs

- **KMS Key:** $1.00/month (optional, for encryption)
- **Lambda Rotation:** ~$0.20/month (included in free tier for most cases)
- **CloudWatch Logs:** ~$0.50/month

**Total Monthly Cost: ~$8.20**

## Security Best Practices

1. **Encryption:**
   - Use KMS keys for encryption at rest
   - Transport secrets over TLS only
   - Never log secret values

2. **Access Control:**
   - Limit IAM permissions to minimum required
   - Use resource-based policies for fine-grained access
   - Rotate credentials regularly (30 days)

3. **Audit & Monitoring:**
   - Enable CloudTrail logging
   - Set up CloudWatch alarms for rotation failures
   - Review access logs monthly

4. **Backup & Recovery:**
   - Keep encrypted backup of initial secrets
   - Test recovery procedures quarterly
   - Document rollback procedures

## References

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [Automatic Secret Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [IAM Policies for Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/iam-policies.html)

## Support

For issues or questions:

1. Check CloudWatch logs: `/aws/secretsmanager/`
2. Review CloudTrail events
3. Test with AWS CLI:
   ```bash
   aws secretsmanager get-secret-value --secret-id silxarcrm/gemini/api-key --region us-east-1
   ```
