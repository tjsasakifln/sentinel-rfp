# Infrastructure Guide - Sentinel RFP

## Overview

This document describes the infrastructure architecture for Sentinel RFP, optimized for Railway deployment. The architecture prioritizes simplicity, cost-effectiveness, and operational excellence for a growing SaaS product.

## Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE OVERVIEW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                         ┌───────────────┐                           │
│                         │   Cloudflare  │                           │
│                         │      CDN      │                           │
│                         │  + WAF + DNS  │                           │
│                         └───────┬───────┘                           │
│                                 │                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    RAILWAY PROJECT                           │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │                  APPLICATION SERVICES                │   │   │
│  │  │                                                      │   │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │   │
│  │  │  │ Frontend │  │ Backend  │  │  Worker  │          │   │   │
│  │  │  │ (Next.js)│  │ (NestJS) │  │ (BullMQ) │          │   │   │
│  │  │  │          │  │          │  │          │          │   │   │
│  │  │  │ Port 3000│  │ Port 4000│  │ No port  │          │   │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘          │   │   │
│  │  │                                                      │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │                  MANAGED SERVICES                    │   │   │
│  │  │                                                      │   │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │   │
│  │  │  │PostgreSQL│  │  Redis   │  │Meilisearch│         │   │   │
│  │  │  │ +pgvector│  │          │  │          │          │   │   │
│  │  │  │          │  │          │  │          │          │   │   │
│  │  │  │ Starter/ │  │ Starter/ │  │ Template │          │   │   │
│  │  │  │ Pro      │  │ Pro      │  │          │          │   │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘          │   │   │
│  │  │                                                      │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  EXTERNAL SERVICES                           │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │Cloudflare│  │ Anthropic│  │  OpenAI  │  │  Sentry  │   │   │
│  │  │    R2    │  │  Claude  │  │  GPT-4o  │  │Monitoring│   │   │
│  │  │ Storage  │  │          │  │Embeddings│  │          │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Storage (Cloudflare R2)

### Overview

Sentinel RFP uses Cloudflare R2 for object storage, providing an S3-compatible API with zero egress fees and global distribution.

### Bucket Structure

```
sentinel-rfp-storage/
├── documents/          # Uploaded RFP documents (permanent)
│   ├── {orgId}/
│   │   ├── {docId}/
│   │   │   ├── original.pdf
│   │   │   └── metadata.json
├── uploads/            # Multipart upload temporary storage
│   └── {uploadId}/
│       └── part-{n}
├── temp/               # Temporary files (7-day expiration)
│   ├── previews/
│   └── cache/
└── exports/            # Generated Word exports (30-day expiration)
    └── {proposalId}/
        └── proposal-{timestamp}.docx
```

### CORS Configuration

CORS is configured to allow presigned URLs to work from frontend and API domains.

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://app.sentinel-rfp.com",
        "https://api.sentinel-rfp.com",
        "http://localhost:3000",
        "http://localhost:4000"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedHeaders": [
        "Content-Type",
        "Content-Disposition",
        "Authorization",
        "x-amz-*",
        "Access-Control-Allow-Origin"
      ],
      "ExposeHeaders": ["ETag", "Content-Length", "Content-Type", "Content-Disposition"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### Lifecycle Rules

Automatic cleanup of temporary and old files to optimize storage costs.

```json
{
  "Rules": [
    {
      "ID": "expire-temp-files",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "ID": "expire-old-uploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "uploads/"
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 2
      }
    }
  ]
}
```

### Configuration Script

Use the automated configuration script to set up CORS and Lifecycle rules:

```bash
# Set environment variables first
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_R2_ACCESS_KEY=your-access-key
export CLOUDFLARE_R2_SECRET_KEY=your-secret-key
export CLOUDFLARE_R2_BUCKET=sentinel-rfp-storage

# For production domains
export FRONTEND_URL=https://app.sentinel-rfp.com
export API_URL=https://api.sentinel-rfp.com

# Run configuration script
./scripts/configure-r2-bucket.sh
```

The script will:

1. Validate environment variables
2. Check for AWS CLI dependency
3. Configure AWS CLI for R2 endpoint
4. Apply CORS configuration
5. Apply Lifecycle rules
6. Verify configuration
7. Display verification results

### Environment Variables

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=<your-cloudflare-account-id>
CLOUDFLARE_R2_ACCESS_KEY=<r2-access-key-id>
CLOUDFLARE_R2_SECRET_KEY=<r2-secret-access-key>
CLOUDFLARE_R2_BUCKET=sentinel-rfp-storage
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

### Presigned URL Configuration

The R2 service generates presigned URLs with the following defaults:

```typescript
// Upload URLs (60-minute expiration)
const uploadUrl = await r2Service.generatePresignedUploadUrl(
  key,
  contentType,
  60 * 60, // 3600 seconds
);

// Download URLs (60-minute expiration, with Content-Disposition)
const downloadUrl = await r2Service.generatePresignedDownloadUrl(
  key,
  filename, // Optional - sets Content-Disposition header
  60 * 60, // 3600 seconds
);
```

### Security Considerations

1. **CORS**: Only configured domains can access presigned URLs
2. **Expiration**: All presigned URLs expire after 60 minutes
3. **Lifecycle**: Temporary files auto-delete after 7 days
4. **Incomplete Uploads**: Multipart uploads abort after 2 days
5. **Private Bucket**: Direct bucket access is disabled; only presigned URLs work

### Validation Checklist

After configuring R2:

- [ ] Run `./scripts/configure-r2-bucket.sh` successfully
- [ ] Verify CORS configuration: `aws s3api get-bucket-cors --bucket $BUCKET_NAME --endpoint-url $ENDPOINT_URL`
- [ ] Verify Lifecycle rules: `aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET_NAME --endpoint-url $ENDPOINT_URL`
- [ ] Test presigned upload URL from frontend (check Network tab for CORS headers)
- [ ] Test presigned download URL from frontend
- [ ] Verify Content-Disposition header sets correct filename
- [ ] Confirm temp files expire after 7 days (check manually or via lifecycle events)

### Troubleshooting

#### CORS Issues

If presigned URLs fail with CORS errors:

1. **Check Origin**: Ensure frontend domain is in `AllowedOrigins`
2. **Verify Configuration**: Run `aws s3api get-bucket-cors`
3. **Re-apply CORS**: Run `./scripts/configure-r2-bucket.sh` again
4. **Browser Cache**: Clear browser cache and retry

#### Lifecycle Rules Not Working

1. **Verify Rules**: Run `aws s3api get-bucket-lifecycle-configuration`
2. **Check Prefix**: Ensure files are in correct path (`temp/`, `uploads/`)
3. **Wait Time**: Lifecycle rules run once per day; allow 24-48 hours
4. **Manual Cleanup**: Use `aws s3 rm s3://$BUCKET_NAME/temp/ --recursive --endpoint-url $ENDPOINT_URL`

### Cost Optimization

| Metric       | Pricing          | Monthly Estimate (100 tenants) |
| ------------ | ---------------- | ------------------------------ |
| Storage (GB) | $0.015/GB/month  | ~$15 (1TB)                     |
| Class A Ops  | $4.50/million    | ~$4.50 (1M uploads)            |
| Class B Ops  | $0.36/million    | ~$0.36 (1M downloads)          |
| Egress       | $0 (zero egress) | $0                             |
| **Total**    |                  | **~$20/month**                 |

Lifecycle rules reduce costs by:

- Auto-deleting temp files after 7 days (~30% storage savings)
- Aborting incomplete uploads after 2 days (~10% storage savings)
- Total estimated savings: **$8/month** at 1TB scale

## Railway Configuration

### Project Structure

```
railway-project/
├── frontend/          # Next.js app
├── backend/           # NestJS API
├── worker/            # BullMQ workers
├── postgresql/        # Managed PostgreSQL
├── redis/             # Managed Redis
└── meilisearch/       # Search service
```

### Environment Configuration

#### railway.toml (Backend)

```toml
[build]
builder = "dockerfile"
dockerfilePath = "apps/api/Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[service]
internalPort = 4000
```

#### railway.toml (Frontend)

```toml
[build]
builder = "dockerfile"
dockerfilePath = "apps/web/Dockerfile"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 30

[service]
internalPort = 3000
```

#### railway.toml (Worker)

```toml
[build]
builder = "dockerfile"
dockerfilePath = "apps/worker/Dockerfile"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

### Environment Variables

```bash
# Database (Auto-injected by Railway)
DATABASE_URL=postgresql://user:pass@host:5432/railway

# Redis (Auto-injected by Railway)
REDIS_URL=redis://default:pass@host:6379

# Application
NODE_ENV=production
PORT=4000
APP_URL=https://api.sentinel-rfp.com
FRONTEND_URL=https://app.sentinel-rfp.com

# Authentication
JWT_SECRET=<generated>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Storage
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_R2_ACCESS_KEY=xxx
CLOUDFLARE_R2_SECRET_KEY=xxx
CLOUDFLARE_R2_BUCKET=sentinel-rfp-storage

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Search
MEILISEARCH_HOST=http://meilisearch.railway.internal:7700
MEILISEARCH_API_KEY=<generated>
```

## Dockerfiles

### Backend Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/

RUN npm ci --only=production

# Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build:api

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Security: Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/api ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main.js"]
```

### Frontend Dockerfile

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/

RUN npm ci

# Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build:web

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Worker Dockerfile

```dockerfile
# apps/worker/Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/*/package.json ./packages/

RUN npm ci --only=production

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build:worker

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S worker -u 1001

COPY --from=builder --chown=worker:nodejs /app/dist/apps/worker ./dist
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/package.json ./

USER worker

CMD ["node", "dist/main.js"]
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

      - name: Run npm audit
        run: npm audit --audit-level=high

  deploy-staging:
    needs: [test, security]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to staging
        run: railway up --environment staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-production:
    needs: [test, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Run database migrations
        run: railway run npx prisma migrate deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy to production
        run: railway up --environment production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Scaling Strategy

### Railway Scaling

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCALING CONFIGURATION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SERVICE          REPLICAS    CPU     MEMORY    STRATEGY            │
│  ────────         ────────    ───     ──────    ────────            │
│                                                                      │
│  Frontend         1-3         0.5     512MB     Auto (CPU >70%)     │
│  Backend          1-5         1       1GB       Auto (CPU >70%)     │
│  Worker           1-3         1       1GB       Queue depth >100    │
│                                                                      │
│  PostgreSQL       1           2       4GB       Vertical (manual)   │
│  Redis            1           0.5     256MB     Single instance     │
│  Meilisearch      1           1       1GB       Single instance     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Horizontal Scaling

```typescript
// Backend: Stateless design for horizontal scaling
// - Sessions stored in Redis
// - File uploads go directly to R2
// - No local file storage

// Worker: Concurrent job processing
const workerConfig = {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
  maxStalledCount: 3,
  stalledInterval: 30000,
};
```

## Monitoring & Observability

### Health Checks

```typescript
// apps/api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }

  @Get('ready')
  readiness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('live')
  liveness() {
    return { status: 'ok' };
  }
}
```

### Metrics & Logging

```typescript
// Structured logging
import { Logger } from '@nestjs/common';

const logger = new Logger('AppService');

logger.log({
  message: 'Proposal created',
  proposalId: proposal.id,
  organizationId: proposal.organizationId,
  duration: Date.now() - startTime,
});

// Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});
```

### Alerts

| Metric                | Warning | Critical | Action        |
| --------------------- | ------- | -------- | ------------- |
| API Response Time P95 | >500ms  | >2s      | Scale backend |
| Error Rate            | >1%     | >5%      | Page on-call  |
| Database Connections  | >70%    | >90%     | Increase pool |
| Redis Memory          | >70%    | >90%     | Review TTLs   |
| Queue Depth           | >100    | >500     | Scale workers |
| Storage Usage         | >70%    | >90%     | Archive data  |

## Networking

### DNS Configuration

```
# Cloudflare DNS Records
app.sentinel-rfp.com     CNAME  frontend.up.railway.app
api.sentinel-rfp.com     CNAME  backend.up.railway.app
sentinel-rfp.com         CNAME  frontend.up.railway.app
```

### Railway Private Networking

```
# Internal service communication (no internet egress)
REDIS_URL=redis://redis.railway.internal:6379
MEILISEARCH_HOST=http://meilisearch.railway.internal:7700

# Backend accessible from frontend via private network
API_INTERNAL_URL=http://backend.railway.internal:4000
```

## Disaster Recovery

### Backup Strategy

| Component   | Method                   | Frequency  | Retention   |
| ----------- | ------------------------ | ---------- | ----------- |
| PostgreSQL  | Railway snapshots        | Continuous | 7 days PITR |
| PostgreSQL  | Manual export to R2      | Daily      | 30 days     |
| Redis       | Not backed up            | N/A        | Cache only  |
| R2 Storage  | Cross-region replication | Continuous | Indefinite  |
| Meilisearch | Rebuild from PostgreSQL  | On-demand  | N/A         |

### Recovery Procedures

```bash
# 1. Database recovery (Railway Dashboard)
# Point-in-time recovery available for last 7 days

# 2. Manual restore from R2 backup
railway run pg_restore -d $DATABASE_URL backup.dump

# 3. Rebuild search index
railway run npm run search:reindex

# 4. Verify health
curl https://api.sentinel-rfp.com/health
```

### RTO/RPO Targets

| Scenario               | RTO     | RPO    |
| ---------------------- | ------- | ------ |
| Single service failure | 5 min   | 0      |
| Database corruption    | 30 min  | 1 hour |
| Full region outage     | 4 hours | 1 hour |

## Cost Optimization

### Railway Pricing Estimate

| Component   | Tier        | Monthly Cost    |
| ----------- | ----------- | --------------- |
| Frontend    | Starter     | ~$5-20          |
| Backend     | Pro         | ~$20-50         |
| Worker      | Pro         | ~$10-30         |
| PostgreSQL  | Starter/Pro | ~$5-25          |
| Redis       | Starter     | ~$5-10          |
| Meilisearch | Template    | ~$5-15          |
| **Total**   |             | **~$50-150/mo** |

### Cost Monitoring

```typescript
// Track LLM costs per tenant
const usageTracker = {
  trackLLMUsage: async (tenantId: string, tokens: number, cost: number) => {
    await prisma.usageMetric.create({
      data: {
        organizationId: tenantId,
        metricType: 'TOKENS_USED',
        value: tokens,
        unit: 'tokens',
        periodStart: startOfMonth(new Date()),
        periodEnd: endOfMonth(new Date()),
        dimensions: { cost },
      },
    });
  },
};
```

## Security Hardening

### Network Security

```yaml
# Cloudflare WAF Rules
- Block known bad bots
- Rate limit: 100 req/min per IP
- Challenge suspicious traffic
- Block countries (optional)

# Railway Network
- Private networking enabled
- Database not publicly accessible
- Redis not publicly accessible
```

### Secrets Management

```bash
# Railway secrets (encrypted at rest)
railway variables set JWT_SECRET=xxx --environment production
railway variables set ANTHROPIC_API_KEY=xxx --environment production

# Never commit secrets
# Use .env.example for documentation
```

## Future Migration Path

### Phase 3: AWS GovCloud

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GOVCLOUD MIGRATION PATH                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Railway (Current)              AWS GovCloud (Future)               │
│  ────────────────               ─────────────────────               │
│                                                                      │
│  PostgreSQL (Railway)    →      RDS PostgreSQL (GovCloud)           │
│  Redis (Railway)         →      ElastiCache Redis                   │
│  Frontend (Railway)      →      ECS Fargate + ALB                   │
│  Backend (Railway)       →      ECS Fargate + ALB                   │
│  Worker (Railway)        →      ECS Fargate                         │
│  Cloudflare R2           →      S3 (GovCloud)                       │
│                                                                      │
│  Migration Steps:                                                    │
│  1. Set up GovCloud infrastructure (Terraform)                      │
│  2. Database replication setup                                      │
│  3. Parallel deployment                                             │
│  4. DNS cutover                                                     │
│  5. Decommission Railway                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Terraform Preparation

```hcl
# infrastructure/terraform/main.tf (Future use)
# Pre-written for AWS GovCloud migration

module "vpc" {
  source = "./modules/vpc"
  environment = var.environment
}

module "rds" {
  source = "./modules/rds"
  vpc_id = module.vpc.vpc_id
  instance_class = "db.r6g.large"
}

module "ecs" {
  source = "./modules/ecs"
  vpc_id = module.vpc.vpc_id
  services = ["frontend", "backend", "worker"]
}
```

## Operational Runbooks

### Deployment Rollback

```bash
# 1. Identify last good deployment
railway deployments list

# 2. Rollback to previous version
railway rollback <deployment-id>

# 3. Verify health
curl https://api.sentinel-rfp.com/health
```

### Database Migration Failure

```bash
# 1. Check migration status
railway run npx prisma migrate status

# 2. If stuck, resolve manually
railway run npx prisma migrate resolve --rolled-back <migration>

# 3. Fix migration and retry
railway run npx prisma migrate deploy
```

### High Load Response

```bash
# 1. Scale backend
railway service scale backend --replicas 5

# 2. Scale workers
railway service scale worker --replicas 3

# 3. Monitor
railway logs --service backend --follow
```

## Railway Deployment Guide

### Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install globally
   ```bash
   npm install -g @railway/cli
   ```
3. **Railway Token**: Get from Railway dashboard
   ```bash
   railway login
   ```

### Initial Setup

#### 1. Create Railway Project

```bash
# Create new project
railway init

# Link to existing project (if already created)
railway link
```

#### 2. Add Managed Services

From Railway dashboard, add:

- PostgreSQL (with pgvector extension)
- Redis (for caching and BullMQ)

#### 3. Configure Environment Variables

```bash
# Set production environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx
railway variables set OPENAI_API_KEY=sk-xxx
railway variables set SENTRY_DSN=https://xxx@sentry.io/xxx

# Cloudflare R2 Storage
railway variables set CLOUDFLARE_ACCOUNT_ID=xxx
railway variables set CLOUDFLARE_R2_ACCESS_KEY=xxx
railway variables set CLOUDFLARE_R2_SECRET_KEY=xxx
railway variables set CLOUDFLARE_R2_BUCKET=sentinel-rfp-storage
```

### Service Configuration

#### API Service (NestJS)

1. **Create Service** in Railway dashboard
2. **Configure Settings**:
   - Root Directory: `/`
   - Dockerfile Path: `apps/api/Dockerfile`
   - Health Check Path: `/api/health`
   - Port: `3001`
3. **Deploy**:
   ```bash
   railway up --service api
   ```

#### Web Service (Next.js)

1. **Create Service** in Railway dashboard
2. **Configure Settings**:
   - Root Directory: `/`
   - Dockerfile Path: `apps/web/Dockerfile`
   - Health Check Path: `/api/health`
   - Port: `3000`
3. **Set Environment Variables**:
   ```bash
   railway variables set NEXT_PUBLIC_API_URL=https://api-production-xxx.up.railway.app
   ```
4. **Deploy**:
   ```bash
   railway up --service web
   ```

### Health Checks

Both services include health check endpoints:

- **API**: `GET /api/health`
  - Returns 200 if healthy
  - Returns 503 if database unavailable
  - Includes uptime, environment, and database status

- **Web**: `GET /api/health`
  - Returns 200 if Next.js server is running
  - Includes uptime and environment info

### Deployment Process

#### Automatic Deployment (via GitHub)

1. **Connect GitHub Repository** in Railway dashboard
2. **Configure Auto-Deploy**:
   - Branch: `main`
   - Deploy on push: Enabled
3. **Push to main**:
   ```bash
   git push origin main
   ```

#### Manual Deployment (via CLI)

```bash
# Deploy specific service
railway up --service api
railway up --service web

# Deploy all services
railway up
```

### Database Migrations

Run Prisma migrations on deployment:

```bash
# Before deploying new code
railway run --service api npx prisma migrate deploy
```

### Monitoring Deployments

```bash
# View deployment logs
railway logs --service api
railway logs --service web

# View deployment history
railway deployments list

# Rollback to previous deployment
railway rollback <deployment-id>
```

### Custom Domains

1. **Add Domain** in Railway service settings
2. **Configure DNS**:
   ```
   # Cloudflare DNS (recommended for SSL + WAF)
   api.sentinel-rfp.com    CNAME   api-production-xxx.up.railway.app
   app.sentinel-rfp.com    CNAME   web-production-xxx.up.railway.app
   ```
3. **SSL**: Automatically provisioned by Railway

### Troubleshooting

#### Build Failures

```bash
# View build logs
railway logs --service api --build

# Common issues:
# 1. Missing dependencies in Dockerfile
# 2. Incorrect build context
# 3. Memory limits during build (increase Railway plan)
```

#### Health Check Failures

```bash
# Test health endpoint locally
docker build -t api-test -f apps/api/Dockerfile .
docker run -p 3001:3001 --env-file .env api-test

curl http://localhost:3001/api/health
```

#### Database Connection Issues

```bash
# Verify DATABASE_URL is set
railway variables get DATABASE_URL

# Test database connection
railway run --service api npx prisma db execute --stdin <<< "SELECT 1"
```

### Validation Checklist

After deployment, verify:

- [ ] API health endpoint responds: `curl https://api.yourdomain.com/api/health`
- [ ] Web health endpoint responds: `curl https://app.yourdomain.com/api/health`
- [ ] Database migrations applied: `railway run npx prisma migrate status`
- [ ] Environment variables set correctly
- [ ] Health checks passing in Railway dashboard
- [ ] SSL certificates active
- [ ] Logs show no errors
- [ ] API Swagger docs accessible: `/api/docs`

### Production Readiness

Before going to production:

1. **Enable Auto-Scaling**:
   - Set min/max replicas per service
   - Configure CPU/memory thresholds

2. **Set Up Monitoring**:
   - Configure Sentry alerts
   - Set up uptime monitoring (e.g., UptimeRobot)

3. **Backup Strategy**:
   - Enable Railway PostgreSQL automated backups
   - Schedule manual exports to R2

4. **Security**:
   - Review environment variables
   - Enable Cloudflare WAF
   - Configure rate limiting

5. **Performance**:
   - Enable Redis caching
   - Configure CDN for static assets
   - Optimize database queries

## References

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [NestJS Docker Deployment](https://docs.nestjs.com/recipes/docker)
