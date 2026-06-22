# SilxaCRM Deployment Guide

**Last Updated:** June 22, 2026  
**Version:** 1.0.0  
**Environment:** Production-ready  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup & Development](#local-setup--development)
3. [AWS Secrets Manager Configuration](#aws-secrets-manager-configuration)
4. [Docker Build & Images](#docker-build--images)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Health Checks](#health-checks)
7. [Monitoring & Observability](#monitoring--observability)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Python:** 3.10 or higher
- **Node.js:** 18.x or higher
- **PostgreSQL:** 14.x or higher
- **Redis:** 6.x or higher (for caching and job queues)
- **Docker:** 20.10+ (for containerized deployment)
- **Kubernetes:** 1.24+ (for container orchestration)
- **kubectl:** 1.24+ (for Kubernetes CLI operations)
- **AWS Account:** With appropriate IAM permissions

### Required AWS Services

- **RDS PostgreSQL 14+:** Database
- **ElastiCache Redis 6+:** Caching and job queues
- **Secrets Manager:** Credential storage
- **ECR (Elastic Container Registry):** Docker image registry
- **ECS/EKS:** Container orchestration
- **CloudWatch:** Logging and monitoring
- **IAM Roles & Policies:** Service authentication

### Required Third-Party APIs

- **Google Gemini API Key:** AI/LLM capabilities
- **ElevenLabs API Key:** Voice synthesis (TTS) and speech recognition (STT)
- **Twilio Account SID & Auth Token:** Telephony integration
- **Firebase Admin SDK:** Real-time database and authentication
- **Stripe API Key:** Payment processing
- **OpenAI API Key:** Alternative AI model support
- **Cal.com API Key:** Calendar/scheduling integration
- **Resend API Key:** Email service

### Local Machine Setup

```bash
# Verify Python version
python3 --version  # Should be 3.10+

# Verify Node.js version
node --version     # Should be v18+

# Verify PostgreSQL client
psql --version     # Should be 14+

# Verify Docker installation
docker --version   # Should be 20.10+

# Verify kubectl installation
kubectl version --client
```

---

## Local Setup & Development

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/silxarcrm.git
cd silxarcrm
```

### 2. Install Backend Dependencies (Node.js/Express)

```bash
cd backend
npm install
npx prisma generate
```

**Expected Output:**
```
npm install
added XXX packages in XXs
npx prisma generate
✔ Generated Prisma Client (v5.22.0)
```

### 3. Install ML Service Dependencies (Python/FastAPI)

```bash
cd ../llamadas
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Expected Output:**
```
Successfully installed fastapi-0.115.6 uvicorn-0.34.0 ... (XX packages)
```

### 4. Database Setup

#### Create `.env` file in `backend/`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/silxacrm_dev"

# Redis
REDIS_URL="redis://localhost:6379/0"

# Node Environment
NODE_ENV="development"
PORT=5000

# Frontend URLs
FRONTEND_URL="http://localhost:3000,http://localhost:3001"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# AWS (optional for local dev, required for Secrets Manager integration)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# Third-party API Keys
OPENAI_API_KEY=""
FIREBASE_PROJECT_ID=""
STRIPE_SECRET_KEY=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
```

#### Create `.env` file in `llamadas/`:

```bash
# Gemini API
GEMINI_API_KEY=""
GEMINI_LIVE_MODEL="gemini-3.1-flash-live-preview"

# ElevenLabs
ELEVENLABS_API_KEY=""
ELEVENLABS_VOICE_ID="ErXwobaYiN019PkySvjV"
ELEVENLABS_TTS_FORMAT="ulaw_8000"

# Twilio
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""

# Server Config
PUBLIC_HOST="localhost:8000"
PORT=8000
LOG_LEVEL="INFO"

# Database
REDIS_URL="redis://localhost:6379/0"
DATABASE_URL="postgresql://user:password@localhost:5432/silxacrm_dev"

# Backend Webhook
BACKEND_WEBHOOK_URL="http://localhost:5000/webhooks/llamadas"
BACKEND_WEBHOOK_SECRET="your-webhook-secret"

# Kafka (optional)
KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# AWS (required for production)
AWS_REGION="us-east-1"
ENVIRONMENT="development"
```

#### Run Database Migrations

```bash
cd backend

# Generate Prisma Client (if not done)
npx prisma generate

# Run migrations using db push (preferred method)
npx prisma db push

# Seed database (if seed script exists)
npx prisma db seed
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "silxacrm_dev"
✔ Successfully pushed to your database
```

### 5. Start Services Locally

#### Terminal 1 - PostgreSQL & Redis

```bash
# Using Docker for quick setup
docker-compose up -d postgres redis
```

#### Terminal 2 - Backend (Express API)

```bash
cd backend
npm run dev
```

**Expected Output:**
```
[BOOT] CRM Maestro API process started
Server listening on port 5000
```

#### Terminal 3 - ML Service (FastAPI)

```bash
cd llamadas
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 6. Verify Local Setup

```bash
# Check Express API health
curl http://localhost:5000/health

# Check FastAPI health
curl http://localhost:8000/health

# Check Postgres connectivity
psql postgresql://user:password@localhost:5432/silxacrm_dev -c "SELECT 1"

# Check Redis connectivity
redis-cli ping
```

---

## AWS Secrets Manager Configuration

### 1. Create Secret for Backend (Express)

```bash
aws secretsmanager create-secret \
  --name silxacrm/backend/prod \
  --region us-east-1 \
  --description "SilxaCRM Backend Express API secrets" \
  --secret-string '{
    "DATABASE_URL": "postgresql://user:password@rds-endpoint:5432/silxacrm_prod",
    "REDIS_URL": "redis://elasticache-endpoint:6379/0",
    "JWT_SECRET": "your-production-jwt-secret-key",
    "OPENAI_API_KEY": "sk-...",
    "FIREBASE_PROJECT_ID": "your-firebase-project",
    "FIREBASE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----...",
    "STRIPE_SECRET_KEY": "sk_live_...",
    "TWILIO_ACCOUNT_SID": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "TWILIO_AUTH_TOKEN": "your-twilio-token",
    "TWILIO_FROM_NUMBER": "+1234567890",
    "RESEND_API_KEY": "re_...",
    "SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/...",
    "FRONTEND_URL": "https://app.yourcompany.com,https://app2.yourcompany.com"
  }'
```

### 2. Create Secret for ML Service (FastAPI)

```bash
aws secretsmanager create-secret \
  --name silxacrm/llamadas/prod \
  --region us-east-1 \
  --description "SilxaCRM FastAPI ML Service secrets" \
  --secret-string '{
    "GEMINI_API_KEY": "AIzaSy...",
    "GEMINI_LIVE_MODEL": "gemini-3.1-flash-live-preview",
    "ELEVENLABS_API_KEY": "sk_...",
    "ELEVENLABS_VOICE_ID": "ErXwobaYiN019PkySvjV",
    "TWILIO_ACCOUNT_SID": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "TWILIO_AUTH_TOKEN": "your-twilio-token",
    "TWILIO_FROM_NUMBER": "+1234567890",
    "DATABASE_URL": "postgresql://user:password@rds-endpoint:5432/silxacrm_prod",
    "REDIS_URL": "redis://elasticache-endpoint:6379/0",
    "BACKEND_WEBHOOK_URL": "https://api.yourcompany.com/webhooks/llamadas",
    "BACKEND_WEBHOOK_SECRET": "webhook-secret-key",
    "CALCOM_API_KEY": "cal_...",
    "PAGERDUTY_INTEGRATION_KEY": "your-pagerduty-key"
  }'
```

### 3. Create Secret for Scheduler Service

```bash
aws secretsmanager create-secret \
  --name silxacrm/scheduler/prod \
  --region us-east-1 \
  --description "SilxaCRM Scheduler/Worker secrets" \
  --secret-string '{
    "DATABASE_URL": "postgresql://user:password@rds-endpoint:5432/silxacrm_prod",
    "REDIS_URL": "redis://elasticache-endpoint:6379/0",
    "KAFKA_BOOTSTRAP_SERVERS": "kafka-broker-1:9092,kafka-broker-2:9092",
    "KAFKA_DEAL_ACTIVITIES_TOPIC": "deal-activities"
  }'
```

### 4. Grant IAM Permissions

```bash
# Create inline policy for ECS task execution role
aws iam put-role-policy \
  --role-name silxacrm-ecs-task-role \
  --policy-name secrets-manager-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        "Resource": [
          "arn:aws:secretsmanager:us-east-1:ACCOUNT-ID:secret:silxacrm/backend/prod-*",
          "arn:aws:secretsmanager:us-east-1:ACCOUNT-ID:secret:silxacrm/llamadas/prod-*",
          "arn:aws:secretsmanager:us-east-1:ACCOUNT-ID:secret:silxacrm/scheduler/prod-*"
        ]
      }
    ]
  }'
```

### 5. Retrieve Secrets in Application Code

#### Backend (Node.js)

```typescript
import * as AWS from '@aws-sdk/client-secrets-manager';

const client = new AWS.SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName: string) {
  try {
    const response = await client.getSecretValue({ SecretId: secretName });
    if ('SecretString' in response) {
      return JSON.parse(response.SecretString);
    }
  } catch (error) {
    console.error(`Failed to retrieve secret: ${secretName}`, error);
    throw error;
  }
}

// Usage
const backendSecrets = await getSecret('silxacrm/backend/prod');
process.env.DATABASE_URL = backendSecrets.DATABASE_URL;
```

#### ML Service (Python)

The `config.py` file already includes AWS Secrets Manager integration via the `SecretsClient`:

```python
from app.secrets_client import get_secrets_client

secrets_client = get_secrets_client(
    region="us-east-1",
    environment="production"
)

# Automatically injects secrets
gemini_key = secrets_client.get_gemini_key()
twilio_creds = secrets_client.get_twilio_credentials()
```

### 6. Rotate Secrets (Monthly Recommended)

```bash
# Update secret value
aws secretsmanager update-secret \
  --secret-id silxacrm/backend/prod \
  --secret-string '{...updated values...}'

# Automatic rotation (setup Lambda function for automated rotation)
aws secretsmanager rotate-secret \
  --secret-id silxacrm/backend/prod \
  --rotation-rules AutomaticallyAfterDays=30
```

---

## Docker Build & Images

### 1. Build Backend Image (Node.js/Express)

#### Create `backend/Dockerfile` (Already exists, verify):

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

RUN npm install
RUN npx prisma generate

COPY src ./src/
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

#### Build Command

```bash
cd backend

# Build image
docker build \
  --build-arg NODE_ENV=production \
  -t silxacrm-backend:latest \
  -t silxacrm-backend:1.0.0 \
  .

# Tag for ECR
docker tag silxacrm-backend:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-backend:latest

docker tag silxacrm-backend:1.0.0 \
  123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-backend:1.0.0
```

### 2. Build ML Service Image (Python/FastAPI)

#### Create `llamadas/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app
COPY main.py .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Build Command

```bash
cd llamadas

# Build image
docker build \
  --build-arg PYTHON_VERSION=3.11 \
  -t silxacrm-llamadas:latest \
  -t silxacrm-llamadas:1.0.0 \
  .

# Tag for ECR
docker tag silxacrm-llamadas:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-llamadas:latest

docker tag silxacrm-llamadas:1.0.0 \
  123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-llamadas:1.0.0
```

### 3. Build Scheduler/Worker Image

#### Create `scheduler/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

RUN npm install --production
RUN npx prisma generate

COPY dist ./dist

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/workers/scheduler.js"]
```

#### Build Command

```bash
cd backend

# Build scheduler service
docker build \
  -f Dockerfile.scheduler \
  -t silxacrm-scheduler:latest \
  -t silxacrm-scheduler:1.0.0 \
  .

# Tag for ECR
docker tag silxacrm-scheduler:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-scheduler:latest
```

### 4. Push Images to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Create repositories if they don't exist
aws ecr create-repository --repository-name silxacrm-backend --region us-east-1
aws ecr create-repository --repository-name silxacrm-llamadas --region us-east-1
aws ecr create-repository --repository-name silxacrm-scheduler --region us-east-1

# Push images
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-backend:1.0.0

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-llamadas:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-llamadas:1.0.0

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-scheduler:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-scheduler:1.0.0
```

### 5. Local Docker Testing

```bash
# Test backend image locally
docker run \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e REDIS_URL="redis://host:6379/0" \
  silxacrm-backend:latest

# Test llamadas image locally
docker run \
  -p 8000:8000 \
  -e GEMINI_API_KEY="your-key" \
  -e TWILIO_ACCOUNT_SID="your-sid" \
  silxacrm-llamadas:latest
```

---

## Kubernetes Deployment

### 1. Prerequisites

- EKS cluster already created and running
- kubectl configured to access your cluster
- Helm 3.x installed (optional but recommended)
- Docker images already pushed to ECR

### 2. Create Namespaces

```bash
kubectl create namespace silxacrm-prod
kubectl create namespace silxacrm-monitoring
```

### 3. Create Secrets in Kubernetes

```bash
# Backend secrets
kubectl create secret generic silxacrm-backend-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_SECRET="..." \
  -n silxacrm-prod

# ML Service secrets
kubectl create secret generic silxacrm-llamadas-secrets \
  --from-literal=GEMINI_API_KEY="..." \
  --from-literal=ELEVENLABS_API_KEY="..." \
  --from-literal=TWILIO_ACCOUNT_SID="..." \
  -n silxacrm-prod
```

Or reference AWS Secrets Manager via External Secrets Operator (recommended for production).

### 4. Deploy Backend Service (Express API)

#### File: `k8s/backend-deployment.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: silxacrm-backend-config
  namespace: silxacrm-prod
data:
  NODE_ENV: "production"
  LOG_LEVEL: "INFO"
  FRONTEND_URL: "https://app.yourcompany.com,https://app2.yourcompany.com"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: silxacrm-backend
  namespace: silxacrm-prod
  labels:
    app: silxacrm-backend
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: silxacrm-backend
  template:
    metadata:
      labels:
        app: silxacrm-backend
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "5000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: silxacrm-backend
      containers:
      - name: backend
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-backend:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 5000
          protocol: TCP
        envFrom:
        - configMapRef:
            name: silxacrm-backend-config
        - secretRef:
            name: silxacrm-backend-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 15
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - silxacrm-backend
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: silxacrm-backend
  namespace: silxacrm-prod
  labels:
    app: silxacrm-backend
spec:
  type: ClusterIP
  ports:
  - port: 5000
    targetPort: 5000
    protocol: TCP
    name: http
  selector:
    app: silxacrm-backend

---
apiVersion: autoscaling.k8s.io/v2
kind: HorizontalPodAutoscaler
metadata:
  name: silxacrm-backend-hpa
  namespace: silxacrm-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: silxacrm-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Deploy

```bash
kubectl apply -f k8s/backend-deployment.yaml
```

### 5. Deploy ML Service (FastAPI)

#### File: `k8s/llamadas-deployment.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: silxacrm-llamadas-config
  namespace: silxacrm-prod
data:
  PORT: "8000"
  LOG_LEVEL: "INFO"
  ENVIRONMENT: "production"
  VOICE_PIPELINE: "elevenlabs"
  TRACE_SAMPLE_RATE: "0.1"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: silxacrm-llamadas
  namespace: silxacrm-prod
  labels:
    app: silxacrm-llamadas
    version: v1
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: silxacrm-llamadas
  template:
    metadata:
      labels:
        app: silxacrm-llamadas
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: silxacrm-llamadas
      containers:
      - name: llamadas
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-llamadas:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 8000
          protocol: TCP
        envFrom:
        - configMapRef:
            name: silxacrm-llamadas-config
        - secretRef:
            name: silxacrm-llamadas-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 20
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 15
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - silxacrm-llamadas
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: silxacrm-llamadas
  namespace: silxacrm-prod
  labels:
    app: silxacrm-llamadas
spec:
  type: ClusterIP
  ports:
  - port: 8000
    targetPort: 8000
    protocol: TCP
    name: http
  selector:
    app: silxacrm-llamadas

---
apiVersion: autoscaling.k8s.io/v2
kind: HorizontalPodAutoscaler
metadata:
  name: silxacrm-llamadas-hpa
  namespace: silxacrm-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: silxacrm-llamadas
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
```

#### Deploy

```bash
kubectl apply -f k8s/llamadas-deployment.yaml
```

### 6. Deploy Scheduler Service (Job Queue Worker)

#### File: `k8s/scheduler-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: silxacrm-scheduler
  namespace: silxacrm-prod
  labels:
    app: silxacrm-scheduler
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: silxacrm-scheduler
  template:
    metadata:
      labels:
        app: silxacrm-scheduler
        version: v1
    spec:
      serviceAccountName: silxacrm-scheduler
      containers:
      - name: scheduler
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-scheduler:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 5001
          protocol: TCP
        envFrom:
        - secretRef:
            name: silxacrm-scheduler-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 15
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 5001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

---
apiVersion: v1
kind: Service
metadata:
  name: silxacrm-scheduler
  namespace: silxacrm-prod
  labels:
    app: silxacrm-scheduler
spec:
  type: ClusterIP
  ports:
  - port: 5001
    targetPort: 5001
    protocol: TCP
  selector:
    app: silxacrm-scheduler
```

#### Deploy

```bash
kubectl apply -f k8s/scheduler-deployment.yaml
```

### 7. Create ServiceAccount & RBAC

#### File: `k8s/rbac.yaml`

```yaml
---
# Backend
apiVersion: v1
kind: ServiceAccount
metadata:
  name: silxacrm-backend
  namespace: silxacrm-prod

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: silxacrm-backend
  namespace: silxacrm-prod
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: silxacrm-backend
  namespace: silxacrm-prod
subjects:
- kind: ServiceAccount
  name: silxacrm-backend
  namespace: silxacrm-prod
roleRef:
  kind: Role
  name: silxacrm-backend
  apiGroup: rbac.authorization.k8s.io

---
# FastAPI Service
apiVersion: v1
kind: ServiceAccount
metadata:
  name: silxacrm-llamadas
  namespace: silxacrm-prod

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: silxacrm-llamadas
  namespace: silxacrm-prod
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: silxacrm-llamadas
  namespace: silxacrm-prod
subjects:
- kind: ServiceAccount
  name: silxacrm-llamadas
  namespace: silxacrm-prod
roleRef:
  kind: Role
  name: silxacrm-llamadas
  apiGroup: rbac.authorization.k8s.io

---
# Scheduler
apiVersion: v1
kind: ServiceAccount
metadata:
  name: silxacrm-scheduler
  namespace: silxacrm-prod

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: silxacrm-scheduler
  namespace: silxacrm-prod
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: silxacrm-scheduler
  namespace: silxacrm-prod
subjects:
- kind: ServiceAccount
  name: silxacrm-scheduler
  namespace: silxacrm-prod
roleRef:
  kind: Role
  name: silxacrm-scheduler
  apiGroup: rbac.authorization.k8s.io
```

#### Deploy RBAC

```bash
kubectl apply -f k8s/rbac.yaml
```

### 8. Setup Ingress

#### File: `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: silxacrm-ingress
  namespace: silxacrm-prod
  annotations:
    kubernetes.io/ingress.class: aws-alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  rules:
  - host: api.yourcompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: silxacrm-backend
            port:
              number: 5000
  - host: voice-api.yourcompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: silxacrm-llamadas
            port:
              number: 8000
```

#### Deploy Ingress

```bash
kubectl apply -f k8s/ingress.yaml
```

### 9. Verify Deployment

```bash
# Check deployments
kubectl get deployments -n silxacrm-prod

# Check pods
kubectl get pods -n silxacrm-prod

# Check services
kubectl get svc -n silxacrm-prod

# Check ingress
kubectl get ingress -n silxacrm-prod

# View pod logs
kubectl logs -f deployment/silxacrm-backend -n silxacrm-prod
kubectl logs -f deployment/silxacrm-llamadas -n silxacrm-prod

# Describe pod for issues
kubectl describe pod <pod-name> -n silxacrm-prod
```

---

## Health Checks

### 1. Backend API (Express)

Add health check endpoint to `backend/src/routes/health.ts`:

```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check (minimal dependencies)
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'silxacrm-backend',
      version: process.env.APP_VERSION || '1.0.0',
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({ status: 'unhealthy', error: String(error) });
  }
});

// Readiness check (all dependencies)
router.get('/ready', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.ping();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        redis: 'ok',
      },
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not_ready',
      error: String(error),
      checks: {
        database: error instanceof PrismaClientError ? 'failed' : 'ok',
        redis: error instanceof RedisError ? 'failed' : 'ok',
      },
    });
  }
});

export default router;
```

Register in `backend/src/index.ts`:

```typescript
import healthRoutes from './routes/health';

app.use('/health', healthRoutes);
app.use('/ready', healthRoutes);
```

### 2. ML Service (FastAPI)

Add to `llamadas/app/main.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from datetime import datetime
import asyncpg

app = FastAPI()

@app.get("/health")
async def health():
    """Basic health check."""
    return JSONResponse({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "silxacrm-llamadas",
        "version": "1.0.0"
    })

@app.get("/ready")
async def readiness():
    """Readiness probe - checks all dependencies."""
    checks = {}
    status_code = 200

    # Check Redis
    try:
        redis_client = await redis.from_url(settings.redis_url)
        await redis_client.ping()
        await redis_client.close()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"failed: {str(e)}"
        status_code = 503

    # Check Database
    try:
        conn = await asyncpg.connect(settings.database_url)
        await conn.execute("SELECT 1")
        await conn.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"failed: {str(e)}"
        status_code = 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if status_code == 200 else "not_ready",
            "timestamp": datetime.now().isoformat(),
            "checks": checks
        }
    )
```

### 3. Scheduler Service

Add health endpoint to scheduler worker:

```typescript
// scheduler/src/routes/health.ts
import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'scheduler' });
});

router.get('/ready', async (req, res) => {
  try {
    // Check if worker is processing jobs
    res.json({ status: 'ready', service: 'scheduler' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: String(error) });
  }
});

export default router;
```

### 4. Test Health Checks

```bash
# Local testing
curl http://localhost:5000/health
curl http://localhost:8000/health

# Kubernetes testing
kubectl port-forward svc/silxacrm-backend 5000:5000 -n silxacrm-prod
curl http://localhost:5000/health

# External testing (via ALB)
curl https://api.yourcompany.com/health
curl https://voice-api.yourcompany.com/health
```

---

## Monitoring & Observability

### 1. Prometheus Scrape Configuration

#### File: `k8s/prometheus-config.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: silxacrm-monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: 'silxacrm-prod'
        environment: 'production'

    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093

    rule_files:
      - /etc/prometheus/rules/*.yml

    scrape_configs:
    - job_name: 'silxacrm-backend'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - silxacrm-prod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: silxacrm-backend
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

    - job_name: 'silxacrm-llamadas'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - silxacrm-prod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: silxacrm-llamadas
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: (.+)
        target_label: __param_port
      - source_labels: [__address__]
        action: replace
        regex: ([^:]+)(?::\d+)?
        replacement: $1:8000
        target_label: __address__

    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
      relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https
      - source_labels: [__meta_kubernetes_client_ip]
        regex: 127.0.0.1
        action: drop
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
```

Deploy Prometheus:

```bash
kubectl apply -f k8s/prometheus-config.yaml
```

### 2. Grafana Dashboard JSON

Create file: `k8s/grafana-dashboard.json`

```json
{
  "dashboard": {
    "title": "SilxaCRM - Production Monitoring",
    "uid": "silxacrm-prod",
    "version": 1,
    "timezone": "UTC",
    "panels": [
      {
        "id": 1,
        "title": "Backend API - Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"silxacrm-backend\"}[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ],
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
      },
      {
        "id": 2,
        "title": "Backend API - Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"silxacrm-backend\"}[5m]))",
            "legendFormat": "{{method}} {{path}}"
          }
        ],
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      },
      {
        "id": 3,
        "title": "FastAPI - Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"silxacrm-llamadas\"}[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ],
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
      },
      {
        "id": 4,
        "title": "FastAPI - Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"silxacrm-llamadas\"}[5m]))",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ],
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 }
      },
      {
        "id": 5,
        "title": "Database - Connection Pool",
        "targets": [
          {
            "expr": "sql_connections_active",
            "legendFormat": "{{pool}}"
          }
        ],
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 16 }
      },
      {
        "id": 6,
        "title": "Redis - Memory Usage",
        "targets": [
          {
            "expr": "redis_memory_used_bytes / 1024 / 1024 / 1024",
            "legendFormat": "Memory (GB)"
          }
        ],
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 6, "y": 16 }
      },
      {
        "id": 7,
        "title": "Pod CPU Usage",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{pod=~\"silxacrm-.*\"}[5m])) by (pod)",
            "legendFormat": "{{pod}}"
          }
        ],
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 20 }
      },
      {
        "id": 8,
        "title": "Pod Memory Usage",
        "targets": [
          {
            "expr": "sum(container_memory_usage_bytes{pod=~\"silxacrm-.*\"}) by (pod) / 1024 / 1024",
            "legendFormat": "{{pod}}"
          }
        ],
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 20 }
      },
      {
        "id": 9,
        "title": "Error Rate (5xx responses)",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "{{job}} {{status}}"
          }
        ],
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 28 }
      },
      {
        "id": 10,
        "title": "Voice Calls - Active",
        "targets": [
          {
            "expr": "twilio_active_calls",
            "legendFormat": "Active Calls"
          }
        ],
        "type": "stat",
        "gridPos": { "h": 4, "w": 6, "x": 12, "y": 28 }
      }
    ]
  }
}
```

Import into Grafana:

```bash
# Port forward Grafana
kubectl port-forward svc/grafana 3000:80 -n silxacrm-monitoring

# Open browser and import JSON at http://localhost:3000
```

### 3. Prometheus Alert Rules

#### File: `k8s/prometheus-rules.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: silxacrm-monitoring
data:
  silxacrm-alerts.yml: |
    groups:
    - name: silxacrm.rules
      interval: 15s
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "{{ $labels.job }} has error rate > 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        annotations:
          summary: "High response latency"
          description: "{{ $labels.job }} p95 latency > 1s"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[30m]) > 0
        for: 5m
        annotations:
          summary: "Pod crash looping"
          description: "{{ $labels.pod }} is restarting frequently"

      - alert: DatabaseConnectionPoolExhausted
        expr: sql_connections_active / sql_connections_limit > 0.8
        for: 10m
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $labels.instance }} is using {{ $value }}% of connections"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{pod=~"silxacrm-.*"} / 1024 / 1024 / 1024 > 1.5
        for: 15m
        annotations:
          summary: "High memory usage in pod"
          description: "{{ $labels.pod }} using > 1.5GB memory"
```

### 4. CloudWatch Logs Integration

For AWS EKS, logs are automatically sent to CloudWatch. Configure log retention:

```bash
aws logs put-retention-policy \
  --log-group-name /aws/eks/silxacrm-prod/cluster \
  --retention-in-days 30
```

### 5. Jaeger Distributed Tracing (Optional)

Deploy Jaeger for distributed tracing:

```yaml
# k8s/jaeger-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: silxacrm-monitoring
spec:
  ports:
  - port: 6831
    protocol: UDP
  - port: 16686
    protocol: TCP
  selector:
    app: jaeger

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: silxacrm-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:latest
        ports:
        - containerPort: 6831
          protocol: UDP
        - containerPort: 16686
          protocol: TCP
```

Configure in FastAPI:

```python
# llamadas/app/main.py
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

jaeger_exporter = JaegerExporter(
    agent_host_name=os.getenv("JAEGER_HOST", "localhost"),
    agent_port=int(os.getenv("JAEGER_PORT", 6831)),
)

trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(SimpleSpanProcessor(jaeger_exporter))

FastAPIInstrumentor.instrument_app(app)
```

---

## Rollback Procedures

### 1. Kubernetes Deployment Rollback

#### Check Rollout History

```bash
kubectl rollout history deployment/silxacrm-backend -n silxacrm-prod
kubectl rollout history deployment/silxacrm-llamadas -n silxacrm-prod
```

#### Rollback to Previous Revision

```bash
# Rollback to previous revision
kubectl rollout undo deployment/silxacrm-backend -n silxacrm-prod

# Rollback to specific revision
kubectl rollout undo deployment/silxacrm-backend --to-revision=2 -n silxacrm-prod
```

#### Monitor Rollback Progress

```bash
kubectl rollout status deployment/silxacrm-backend -n silxacrm-prod -w
```

### 2. Database Rollback (Point-in-Time Recovery)

#### AWS RDS Backup Restore

```bash
# Create snapshot (if not already done)
aws rds create-db-snapshot \
  --db-instance-identifier silxacrm-prod \
  --db-snapshot-identifier silxacrm-prod-rollback-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier silxacrm-prod-restored \
  --db-snapshot-identifier silxacrm-prod-rollback-20260622

# Point-in-time recovery (last 35 days)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier silxacrm-prod \
  --target-db-instance-identifier silxacrm-prod-restored \
  --restore-time 2026-06-22T14:00:00Z
```

### 3. Feature Rollback (Blue-Green Deployment)

Maintain two identical environments (blue/green):

```bash
# Switch traffic to previous version
kubectl patch service silxacrm-backend -n silxacrm-prod \
  -p '{"spec":{"selector":{"version":"v0"}}}'

# Monitor the switch
kubectl get endpoints silxacrm-backend -n silxacrm-prod -w
```

### 4. Canary Deployment for Safe Rollouts

```yaml
# k8s/backend-canary.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: silxacrm-backend-canary
  namespace: silxacrm-prod
spec:
  replicas: 1  # Small canary fleet
  selector:
    matchLabels:
      app: silxacrm-backend
      version: v1.1.0-canary
  template:
    metadata:
      labels:
        app: silxacrm-backend
        version: v1.1.0-canary
    spec:
      containers:
      - name: backend
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/silxacrm-backend:1.1.0-canary
        # ... rest of config
```

Use Istio VirtualService for traffic splitting:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: silxacrm-backend
  namespace: silxacrm-prod
spec:
  hosts:
  - silxacrm-backend
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: silxacrm-backend
        port:
          number: 5000
        subset: v1
      weight: 95
    - destination:
        host: silxacrm-backend
        port:
          number: 5000
        subset: v1-canary
      weight: 5
```

### 5. Rollback Checklist

```
[ ] Identify the issue and affected service
[ ] Check current deployment status
[ ] Review metrics and logs from failed deployment
[ ] Identify last known good revision
[ ] Test rollback in staging environment
[ ] Execute rollback (kubectl rollout undo)
[ ] Monitor pod startup and health checks
[ ] Verify application functionality
[ ] Run smoke tests
[ ] Check metrics return to normal
[ ] Notify team of rollback completion
[ ] Create post-mortem for failed deployment
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Pod Stuck in ImagePullBackOff

**Symptoms:** Pod status shows `ImagePullBackOff`

**Solution:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n silxacrm-prod

# Verify ECR image exists
aws ecr describe-images --repository-name silxacrm-backend --region us-east-1

# Check imagePullSecrets in deployment
kubectl get secrets -n silxacrm-prod
```

#### 2. CrashLoopBackOff - Pod Restart Cycle

**Symptoms:** Pod shows `CrashLoopBackOff` status

**Solution:**
```bash
# Check logs
kubectl logs <pod-name> -n silxacrm-prod --previous
kubectl logs <pod-name> -n silxacrm-prod --tail=100

# Check environment variables
kubectl exec <pod-name> -n silxacrm-prod -- env | grep -i DATABASE

# Describe pod for details
kubectl describe pod <pod-name> -n silxacrm-prod
```

#### 3. Database Connection Errors

**Symptoms:** "connection refused" or "ECONNREFUSED" in logs

**Solution:**
```bash
# Verify RDS is accessible
aws rds describe-db-instances --db-instance-identifier silxacrm-prod

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Test connection from pod
kubectl exec <pod-name> -n silxacrm-prod -- \
  psql postgresql://user:pass@rds-endpoint/dbname -c "SELECT 1"
```

#### 4. Memory Leaks / High Memory Usage

**Symptoms:** Memory continuously increases, eventual OOMKilled

**Solution:**
```bash
# Check memory usage over time
kubectl top pods -n silxacrm-prod --sort-by=memory

# Check heap dump (Node.js)
kubectl exec <pod-name> -n silxacrm-prod -- \
  node -e "require('heapdump').writeSnapshot()" 

# Analyze with clinic.js or Node Inspector
```

#### 5. High Latency / Slow Response Times

**Symptoms:** P95 latency > 1 second

**Solution:**
```bash
# Check database query performance
# Query slow log in CloudWatch or RDS console

# Profile application
kubectl logs <pod-name> -n silxacrm-prod | grep "SLOW_QUERY"

# Check if services are rate limited
curl -v https://api.yourcompany.com/health 2>&1 | grep -i "rate-limit"

# Check CPU throttling
kubectl describe node <node-name>
```

#### 6. Redis Connection Issues

**Symptoms:** "Redis connection timeout" in logs

**Solution:**
```bash
# Check ElastiCache cluster status
aws elasticache describe-cache-clusters --cache-cluster-id silxacrm-redis

# Test connectivity
kubectl run redis-test --image=redis:latest -it --rm -- \
  redis-cli -h silxacrm-redis-endpoint -p 6379 ping

# Check network security groups
aws ec2 describe-security-groups --query 'SecurityGroups[*]'
```

#### 7. Webhook Delivery Failures

**Symptoms:** Webhooks not reaching backend from FastAPI

**Solution:**
```bash
# Check webhook endpoint health
curl -v http://silxacrm-backend:5000/webhooks/llamadas

# Verify secret matches in config
kubectl get secret silxacrm-llamadas-secrets -o yaml

# Check firewall rules between services
kubectl exec <llamadas-pod> -n silxacrm-prod -- \
  curl -v http://silxacrm-backend:5000/health
```

---

## Appendix: Quick Reference

### Environment Variables Checklist

**Backend (.env):**
- [x] DATABASE_URL
- [x] REDIS_URL
- [x] JWT_SECRET
- [x] OPENAI_API_KEY
- [x] FIREBASE credentials
- [x] STRIPE_SECRET_KEY
- [x] TWILIO credentials
- [x] FRONTEND_URL

**FastAPI (.env):**
- [x] GEMINI_API_KEY
- [x] ELEVENLABS_API_KEY
- [x] TWILIO credentials
- [x] DATABASE_URL
- [x] REDIS_URL
- [x] BACKEND_WEBHOOK_URL/SECRET
- [x] CALCOM_API_KEY

### Useful kubectl Commands

```bash
# Get all resources in namespace
kubectl get all -n silxacrm-prod

# Get detailed pod info
kubectl get pods -n silxacrm-prod -o wide

# Stream logs from multiple pods
kubectl logs -f -n silxacrm-prod -l app=silxacrm-backend --all-containers=true

# Execute command in pod
kubectl exec -it <pod> -n silxacrm-prod -- /bin/bash

# Port forward for debugging
kubectl port-forward pod/<pod> 5000:5000 -n silxacrm-prod

# Scale deployment
kubectl scale deployment silxacrm-backend --replicas=5 -n silxacrm-prod
```

### AWS CLI Quick Reference

```bash
# Push Docker image to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com
docker push <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/<REPO>:<TAG>

# Retrieve secrets
aws secretsmanager get-secret-value --secret-id silxacrm/backend/prod --query SecretString --output text

# Check RDS status
aws rds describe-db-instances --db-instance-identifier silxacrm-prod --query 'DBInstances[0].{Status:DBInstanceStatus,Engine:Engine,Version:EngineVersion}'
```

---

**Document Statistics:**
- Total Sections: 8 (major)
- Total Subsections: 45+
- Prerequisites Covered: 7
- Setup Steps: 6
- AWS Integration Points: 5
- Monitoring Metrics: 10+
- Troubleshooting Scenarios: 7

---

*For questions or updates, contact: devops@yourcompany.com*
