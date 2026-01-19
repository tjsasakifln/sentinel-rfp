# Developer Setup Guide

**Last Updated:** January 2026
**Version:** 1.0.0
**Target Audience:** New Developers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running the Application](#running-the-application)
5. [Verifying Installation](#verifying-installation)
6. [Common Setup Issues](#common-setup-issues)
7. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

| Tool               | Minimum Version | Installation Command                                        | Verification       |
| ------------------ | --------------- | ----------------------------------------------------------- | ------------------ |
| **Node.js**        | 20.0.0+         | [Download](https://nodejs.org/)                             | `node --version`   |
| **pnpm**           | 8.0.0+          | `npm install -g pnpm@8.15.0`                                | `pnpm --version`   |
| **Docker Desktop** | 24.0+           | [Download](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| **Git**            | 2.40+           | [Download](https://git-scm.com/)                            | `git --version`    |

### Optional but Recommended

| Tool                  | Purpose                   | Installation                                                     |
| --------------------- | ------------------------- | ---------------------------------------------------------------- |
| **VS Code**           | IDE with workspace config | [Download](https://code.visualstudio.com/)                       |
| **GitHub CLI**        | PR/issue management       | `brew install gh` (macOS) or [Download](https://cli.github.com/) |
| **PostgreSQL Client** | Database inspection       | `brew install postgresql` (macOS)                                |
| **Redis CLI**         | Cache inspection          | `brew install redis` (macOS)                                     |

### System Requirements

- **OS:** Windows 10+ (WSL2), macOS 12+, or Linux (Ubuntu 20.04+)
- **RAM:** 8GB minimum (16GB recommended)
- **Storage:** 10GB free space
- **Network:** Stable internet connection for dependencies

---

## Initial Setup

### 1. Clone the Repository

```bash
# Using HTTPS
git clone https://github.com/tjsasakifln/sentinel-rfp.git
cd sentinel-rfp

# Using SSH (recommended for contributors)
git clone git@github.com:tjsasakifln/sentinel-rfp.git
cd sentinel-rfp
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies (may take 2-3 minutes)
pnpm install
```

This will install dependencies for:

- Root workspace
- `apps/api` (Backend NestJS)
- `apps/web` (Frontend Next.js)
- `packages/database` (Prisma shared schema)
- `packages/ai` (AI/LLM abstraction layer)
- `packages/shared` (Common types/utils)

**Expected Output:**

```
Packages: +XXX
Progress: resolved XXX, reused XXX, downloaded X, added XXX, done
```

### 3. Start Docker Services

```bash
# Start PostgreSQL, Redis, and Meilisearch
pnpm docker:up

# Wait for services to be healthy (30-60 seconds)
pnpm docker:ps
```

**Expected Services:**

- `sentinel-postgres` (port 5432) - PostgreSQL 16 with pgvector
- `sentinel-redis` (port 6379) - Redis 7.x for caching/queues
- `sentinel-meilisearch` (port 7700) - Full-text search engine

**Verify Services:**

```bash
# Check all services are healthy
docker-compose ps

# Expected output: All services showing "healthy" status
```

---

## Environment Configuration

### 1. Create Environment Files

The repository includes example environment files. Copy them to create your local configuration:

```bash
# Backend API environment
cp apps/api/.env.example apps/api/.env

# Frontend Web environment
cp apps/web/.env.example apps/web/.env

# Database package environment
cp packages/database/.env.example packages/database/.env
```

### 2. Configure API Environment

Edit `apps/api/.env` with the following configuration:

```bash
# Database Configuration (PostgreSQL + pgvector)
DATABASE_URL="postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp"

# Redis Configuration (BullMQ queues + caching)
REDIS_URL="redis://localhost:6379"

# Meilisearch Configuration (Full-text search)
MEILI_HOST="http://localhost:7700"
MEILI_MASTER_KEY="sentinel_meili_master_key_dev_only"

# JWT Configuration
JWT_SECRET="your-development-secret-key-change-in-production"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_SECRET="your-development-refresh-secret-key"
JWT_REFRESH_EXPIRES_IN="7d"

# AI/LLM Configuration
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
OPENAI_API_KEY="your-openai-api-key-here"  # Optional for embeddings

# Application Configuration
NODE_ENV="development"
PORT=3001
LOG_LEVEL="debug"

# Sentry Configuration (Optional for local dev)
SENTRY_DSN=""  # Leave empty for local development
```

### 3. Configure Web Environment

Edit `apps/web/.env` with:

```bash
# API Backend URL
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# Application
NEXT_PUBLIC_APP_ENV="development"
```

### 4. Configure Database Package

Edit `packages/database/.env`:

```bash
DATABASE_URL="postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp"
```

### 5. Obtain API Keys

**Anthropic API Key (Required for AI features):**

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create account or sign in
3. Navigate to API Keys section
4. Generate new API key
5. Copy and paste into `apps/api/.env` as `ANTHROPIC_API_KEY`

**OpenAI API Key (Optional - for embeddings):**

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign in and navigate to API Keys
3. Generate new key
4. Copy and paste into `apps/api/.env` as `OPENAI_API_KEY`

---

## Running the Application

### 1. Database Setup

#### Initialize Database with Prisma

```bash
# Navigate to database package
cd packages/database

# Generate Prisma Client
pnpm prisma:generate

# Run migrations to create schema
pnpm prisma:migrate:deploy

# Seed database with sample data
pnpm prisma:seed

# Return to root
cd ../..
```

**What this does:**

- Creates all database tables (User, Organization, Proposal, etc.)
- Installs pgvector extension for vector search
- Creates indexes for performance
- Seeds initial data (test users, organizations, sample proposals)

#### Verify Database

```bash
# Open Prisma Studio (database GUI)
cd packages/database
pnpm prisma:studio

# Opens browser at http://localhost:5555
# Explore: User, Organization, Proposal tables
```

### 2. Start Development Servers

**Option A: Start All Services (Recommended)**

```bash
# From project root
pnpm dev
```

This starts:

- **Backend API** at `http://localhost:3001`
- **Frontend Web** at `http://localhost:3000`
- **Auto-reload** enabled for both

**Option B: Start Services Individually**

```bash
# Terminal 1: Backend API
cd apps/api
pnpm dev

# Terminal 2: Frontend Web
cd apps/web
pnpm dev
```

### 3. Verify Development Environment

After services start successfully, you should see:

**Backend API:**

```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
[Nest] INFO [RoutesResolver] AuthController {/api/v1/auth}
[Nest] INFO [RoutesResolver] ProposalController {/api/v1/proposals}
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Application listening on http://localhost:3001
```

**Frontend Web:**

```
▲ Next.js 14.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 3.2s
```

---

## Verifying Installation

### 1. Health Check Endpoints

```bash
# Backend health check
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 2. Frontend Access

Open browser and navigate to:

- **Frontend:** http://localhost:3000
- **Backend API Health:** http://localhost:3001/health
- **Prisma Studio:** http://localhost:5555 (if running)

### 3. Test Authentication Flow

```bash
# Register a test user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "DevPassword123!",
    "organizationName": "Test Org"
  }'

# Login with test user
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "DevPassword123!"
  }'

# Expected: JWT tokens in response
```

### 4. Run Tests

```bash
# Run all tests
pnpm test

# Run backend tests only
cd apps/api
pnpm test

# Run frontend tests only
cd apps/web
pnpm test
```

**Expected:** All tests should pass (✓ green checkmarks)

---

## Common Setup Issues

### Issue 1: Docker Services Not Starting

**Symptom:**

```
ERROR: Container sentinel-postgres exited with code 1
```

**Solution:**

```bash
# Stop and remove all containers
docker-compose down -v

# Remove old volumes
docker volume prune -f

# Restart services
pnpm docker:up
```

### Issue 2: Port Already in Use

**Symptom:**

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**

```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in .env file
```

### Issue 3: Database Connection Refused

**Symptom:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

```bash
# Wait for PostgreSQL to finish initializing
docker-compose logs postgres

# Wait for message: "database system is ready to accept connections"

# Verify PostgreSQL is running
docker-compose ps postgres

# Retry connection
```

### Issue 4: Prisma Client Not Generated

**Symptom:**

```
Error: Cannot find module '@prisma/client'
```

**Solution:**

```bash
cd packages/database
pnpm prisma:generate
cd ../..
pnpm install
```

### Issue 5: pnpm Install Fails

**Symptom:**

```
ERR_PNPM_LOCKFILE_BREAKING_CHANGE
```

**Solution:**

```bash
# Remove lock file and reinstall
rm pnpm-lock.yaml
pnpm install
```

### Issue 6: Missing API Keys

**Symptom:**

```
ERROR: ANTHROPIC_API_KEY environment variable is not set
```

**Solution:**

1. Obtain API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `apps/api/.env`:
   ```
   ANTHROPIC_API_KEY="sk-ant-api03-xxxx"
   ```
3. Restart backend: `pnpm dev`

---

## Next Steps

Congratulations! Your development environment is ready. Here's what to explore next:

### 1. Understand the Architecture

Read the architecture documentation:

```bash
# High-level overview
cat docs/development/architecture.md

# Detailed technical architecture
cat ARCHITECTURE.md
```

### 2. Review Code Conventions

Learn our coding standards:

```bash
cat docs/development/code-conventions.md
```

### 3. Explore the Database Schema

```bash
# Open Prisma Studio
cd packages/database
pnpm prisma:studio

# View schema definition
cat packages/database/prisma/schema.prisma
```

### 4. Set Up Your IDE

If using VS Code:

```bash
# Open workspace with recommended settings
code sentinel-rfp.code-workspace
```

Install recommended extensions when prompted.

### 5. Pick Your First Issue

Check the project board:

```bash
gh issue list --label "good-first-issue"
```

### 6. Join Development Discussions

- **GitHub Issues:** [Issues](https://github.com/tjsasakifln/sentinel-rfp/issues)
- **Pull Requests:** [PRs](https://github.com/tjsasakifln/sentinel-rfp/pulls)
- **Architecture Decisions:** See `ARCHITECTURE.md` → ADRs

---

## Useful Development Commands

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `pnpm dev`          | Start all services in development mode |
| `pnpm build`        | Build all apps and packages            |
| `pnpm lint`         | Lint all code                          |
| `pnpm format`       | Format code with Prettier              |
| `pnpm test`         | Run all tests                          |
| `pnpm typecheck`    | Type check with TypeScript             |
| `pnpm docker:up`    | Start Docker services                  |
| `pnpm docker:down`  | Stop Docker services                   |
| `pnpm docker:logs`  | View Docker logs                       |
| `pnpm docker:clean` | Remove all Docker data                 |

---

## Getting Help

If you encounter issues not covered here:

1. **Check Troubleshooting Guide:** `docs/development/troubleshooting.md`
2. **Search Existing Issues:** [GitHub Issues](https://github.com/tjsasakifln/sentinel-rfp/issues)
3. **Create New Issue:** Use template for bug reports
4. **Ask in Discussions:** For questions and ideas

---

**Ready to build?** Continue to [Architecture Overview](./architecture.md) →
