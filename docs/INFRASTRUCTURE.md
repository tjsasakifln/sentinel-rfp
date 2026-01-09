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

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Response Time P95 | >500ms | >2s | Scale backend |
| Error Rate | >1% | >5% | Page on-call |
| Database Connections | >70% | >90% | Increase pool |
| Redis Memory | >70% | >90% | Review TTLs |
| Queue Depth | >100 | >500 | Scale workers |
| Storage Usage | >70% | >90% | Archive data |

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

| Component | Method | Frequency | Retention |
|-----------|--------|-----------|-----------|
| PostgreSQL | Railway snapshots | Continuous | 7 days PITR |
| PostgreSQL | Manual export to R2 | Daily | 30 days |
| Redis | Not backed up | N/A | Cache only |
| R2 Storage | Cross-region replication | Continuous | Indefinite |
| Meilisearch | Rebuild from PostgreSQL | On-demand | N/A |

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

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single service failure | 5 min | 0 |
| Database corruption | 30 min | 1 hour |
| Full region outage | 4 hours | 1 hour |

## Cost Optimization

### Railway Pricing Estimate

| Component | Tier | Monthly Cost |
|-----------|------|--------------|
| Frontend | Starter | ~$5-20 |
| Backend | Pro | ~$20-50 |
| Worker | Pro | ~$10-30 |
| PostgreSQL | Starter/Pro | ~$5-25 |
| Redis | Starter | ~$5-10 |
| Meilisearch | Template | ~$5-15 |
| **Total** | | **~$50-150/mo** |

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

## References

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
