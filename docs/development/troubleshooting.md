# Troubleshooting Guide

**Last Updated:** January 2026
**Version:** 1.0.0
**Target Audience:** All Developers

---

## Table of Contents

1. [Database Issues](#database-issues)
2. [Docker Problems](#docker-problems)
3. [Port Conflicts](#port-conflicts)
4. [Build Errors](#build-errors)
5. [TypeScript Errors](#typescript-errors)
6. [Node/pnpm Issues](#nodepnpm-issues)
7. [API/Backend Issues](#apibackend-issues)
8. [Frontend Issues](#frontend-issues)
9. [Authentication Problems](#authentication-problems)
10. [Performance Issues](#performance-issues)

---

## Database Issues

### Cannot Connect to PostgreSQL

**Symptom:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: the database system is initializing the default database cluster
```

**Solutions:**

1. **Check if service is running:**

   ```bash
   # Check container status
   docker-compose ps postgres

   # Expected: sentinel-postgres running "healthy"
   ```

2. **Wait for initialization (first run):**

   ```bash
   # PostgreSQL takes 30-60 seconds on first start
   docker-compose logs postgres

   # Look for: "database system is ready to accept connections"
   ```

3. **Restart PostgreSQL:**

   ```bash
   docker-compose restart postgres

   # Wait for healthy status
   sleep 30
   docker-compose ps postgres
   ```

4. **Check connection string:**

   ```bash
   # Verify in packages/database/.env
   DATABASE_URL="postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp"

   # Test connection manually
   psql postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp
   ```

5. **Port already in use:**

   ```bash
   # Find process using 5432
   lsof -i :5432        # macOS/Linux
   netstat -ano | findstr :5432  # Windows

   # Kill the process or change PORT in docker-compose.yml
   ```

6. **Database doesn't exist:**

   ```bash
   # Manually create database
   docker exec sentinel-postgres createdb \
     -U sentinel_user sentinel_rfp

   # Run migrations
   cd packages/database
   pnpm prisma:migrate:deploy
   ```

---

### Prisma Client Not Found

**Symptom:**

```
Error: Cannot find module '@prisma/client'
Error: Failed to load PrismaClient
```

**Solutions:**

1. **Generate Prisma Client:**

   ```bash
   cd packages/database
   pnpm prisma:generate
   cd ../..
   ```

2. **Reinstall dependencies:**

   ```bash
   rm pnpm-lock.yaml
   pnpm install
   ```

3. **Check schema.prisma exists:**

   ```bash
   ls -la packages/database/prisma/schema.prisma
   # Should exist and be valid
   ```

4. **Verify postinstall script ran:**
   ```bash
   # Check if .prisma directory was created
   ls -la packages/database/node_modules/.prisma/
   ```

---

### Migration Fails or Corrupts Data

**Symptom:**

```
Error: Migration failed to apply cleanly to the shadow database
Error: Foreign key constraint failed on the field
```

**Solutions:**

1. **Review the migration file:**

   ```bash
   # Check latest migration
   ls -la packages/database/prisma/migrations/ | tail -5

   # View the SQL
   cat packages/database/prisma/migrations/*/migration.sql
   ```

2. **Reset database (development only):**

   ```bash
   cd packages/database

   # WARNING: This deletes all data
   pnpm prisma:migrate:reset

   # This will:
   # 1. Drop all tables
   # 2. Re-run migrations from scratch
   # 3. Apply seed data
   ```

3. **Manually resolve migration:**

   ```bash
   # View migration status
   pnpm prisma:migrate:status

   # Mark as resolved if corrupted
   pnpm prisma:migrate:resolve --rolled-back "20240101120000_migration_name"
   ```

4. **Check for conflicting migrations:**
   ```bash
   # Multiple developers might create conflicting migrations
   # Resolution: squash migrations
   pnpm prisma:migrate:deploy --schema packages/database/prisma/schema.prisma
   ```

---

### Soft Delete Not Working

**Symptom:**

```
Records marked as deleted still appear in queries
Wrong number of records returned
```

**Solutions:**

1. **Always check deletedAt in queries:**

   ```typescript
   // ❌ Wrong - doesn't exclude soft-deleted
   const proposals = await prisma.proposal.findMany({
     where: { organizationId },
   });

   // ✅ Correct - excludes soft-deleted
   const proposals = await prisma.proposal.findMany({
     where: {
       organizationId,
       deletedAt: null, // Critical!
     },
   });
   ```

2. **Create helper for consistent filtering:**

   ```typescript
   // utils/soft-delete.utils.ts
   export const activOnly = (organizationId: string) => ({
     organizationId,
     deletedAt: null,
   });

   // Usage
   const proposals = await prisma.proposal.findMany({
     where: activOnly('org-123'),
   });
   ```

3. **Check index is being used:**
   ```bash
   # Verify index exists
   psql postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp -c \
     "SELECT * FROM pg_indexes WHERE tablename='proposals';"
   ```

---

## Docker Problems

### Container Exits Immediately

**Symptom:**

```
container exited with code 1
ERROR: Container sentinel-postgres exited with code 1
```

**Solutions:**

1. **Check container logs:**

   ```bash
   docker-compose logs postgres
   docker-compose logs redis
   docker-compose logs meilisearch
   ```

2. **Check for port conflicts:**

   ```bash
   lsof -i :5432     # PostgreSQL
   lsof -i :6379     # Redis
   lsof -i :7700     # Meilisearch
   ```

3. **Remove corrupted volumes:**

   ```bash
   # Stop containers
   docker-compose down

   # Remove volumes
   docker volume rm sentinel-rfp_postgres_data
   docker volume rm sentinel-rfp_redis_data

   # Restart (will recreate clean volumes)
   docker-compose up -d
   ```

4. **Check Docker daemon:**
   ```bash
   # Restart Docker
   docker system prune -a
   docker-compose ps
   ```

---

### Out of Disk Space

**Symptom:**

```
Error: no space left on device
docker: Error response from daemon
```

**Solutions:**

1. **Check disk usage:**

   ```bash
   # macOS/Linux
   df -h

   # Windows
   dir C:\
   ```

2. **Clean up Docker:**

   ```bash
   # Remove unused images/volumes/containers
   docker system prune -a --volumes

   # Or selective cleanup
   docker volume prune -f
   docker image prune -f
   ```

3. **Check PostgreSQL data:**

   ```bash
   # PostgreSQL logs take space
   docker exec sentinel-postgres du -sh /var/lib/postgresql/data

   # Vacuum database
   docker exec sentinel-postgres vacuumdb -U sentinel_user -d sentinel_rfp
   ```

---

### Services Not Healthy

**Symptom:**

```
STATUS: unhealthy
docker-compose ps shows status "starting" stuck for long time
```

**Solutions:**

1. **Check health check:**

   ```bash
   # View logs for each service
   docker-compose logs postgres -f
   docker-compose logs redis -f
   docker-compose logs meilisearch -f
   ```

2. **Restart unhealthy service:**

   ```bash
   docker-compose restart postgres
   sleep 30
   docker-compose ps
   ```

3. **Force recreate:**

   ```bash
   docker-compose down
   docker-compose up -d
   docker-compose ps  # Wait for all 'healthy'
   ```

4. **Increase health check timeout:**
   ```yaml
   # docker-compose.yml
   services:
     postgres:
       healthcheck:
         test: ['CMD-SHELL', 'pg_isready']
         interval: 5s
         timeout: 10s # Increase from 5s
         retries: 10 # Increase from 5
   ```

---

## Port Conflicts

### Port Already in Use

**Symptom:**

```
Error: listen EADDRINUSE: address already in use :::3000
Error: Cannot start service on port 5432
```

**Solutions:**

1. **Find process using port:**

   ```bash
   # macOS/Linux
   lsof -i :3000
   lsof -i :3001
   lsof -i :5432

   # Windows
   netstat -ano | findstr :3000
   tasklist /FI "PID eq <PID>"
   ```

2. **Kill process:**

   ```bash
   # macOS/Linux
   kill -9 <PID>

   # Windows
   taskkill /PID <PID> /F
   ```

3. **Change port in configuration:**

   ```bash
   # Frontend - apps/web/.env
   PORT=3000  # Change to 3002, 3003, etc.

   # Backend - apps/api/.env
   PORT=3001  # Change to 3002, etc.

   # Docker - docker-compose.yml
   ports:
     - "5433:5432"  # Host:Container mapping
   ```

4. **Release port (macOS):**
   ```bash
   # Disable service using port
   sudo lsof -i :5432 -sTCP:LISTEN | grep -v PID | awk '{print $2}' | xargs kill -9
   ```

---

## Build Errors

### Build Fails with TypeScript Errors

**Symptom:**

```
Error: Found X errors
error TS2307: Cannot find module
error TS1005: ';' expected
```

**Solutions:**

1. **Type check all packages:**

   ```bash
   pnpm typecheck

   # Or for specific package
   cd apps/api
   pnpm typecheck
   ```

2. **Fix import paths:**

   ```typescript
   // ❌ Wrong - relative path too complex
   import { User } from '../../../../../types';

   // ✅ Correct - use tsconfig paths
   import { User } from '@sentinel-rfp/shared/types';
   ```

3. **Regenerate Prisma Client:**

   ```bash
   cd packages/database
   pnpm prisma:generate
   cd ../..
   pnpm install
   ```

4. **Clear build cache:**

   ```bash
   # Remove build artifacts
   find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null
   find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null

   # Rebuild
   pnpm build
   ```

---

### ESLint/Prettier Errors

**Symptom:**

```
error: 'x' is assigned a value but never used
error: Strings must use single quotes
```

**Solutions:**

1. **Auto-fix linting issues:**

   ```bash
   pnpm lint --fix

   # Or specific package
   cd apps/api
   pnpm lint --fix
   ```

2. **Format code:**

   ```bash
   pnpm format
   ```

3. **Check for issues without fixing:**

   ```bash
   pnpm lint --check
   pnpm format --check
   ```

4. **Disable rule for specific line:**

   ```typescript
   // ✅ Good - suppress specific lint rule
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const data: any = response;

   // ❌ Bad - suppress all rules
   // eslint-disable
   ```

---

## TypeScript Errors

### 'any' Type Errors

**Symptom:**

```
error TS7006: Parameter 'x' implicitly has an 'any' type
error TS2322: Type 'any' is not assignable to type 'User'
```

**Solutions:**

1. **Add explicit types:**

   ```typescript
   // ❌ Bad
   function processUser(user) {
     return user.id;
   }

   // ✅ Good
   function processUser(user: User): string {
     return user.id;
   }
   ```

2. **Use generic types:**

   ```typescript
   function processArray<T>(items: T[]): T[] {
     return items;
   }
   ```

3. **If necessary, use unknown:**
   ```typescript
   // Only when type is truly unknown
   function parse(input: unknown): Parsed {
     if (typeof input === 'object') {
       return parseObject(input);
     }
     throw new Error('Invalid input');
   }
   ```

---

### Import Path Errors

**Symptom:**

```
error TS2307: Cannot find module '@sentinel-rfp/database'
error TS6059: File is not under 'rootDir'
```

**Solutions:**

1. **Check tsconfig.json paths:**

   ```json
   {
     "compilerOptions": {
       "paths": {
         "@sentinel-rfp/*": ["../../packages/*/src"],
         "@/*": ["./src"]
       }
     }
   }
   ```

2. **Install missing package:**

   ```bash
   pnpm install --workspace-root
   ```

3. **Verify package.json exports:**

   ```json
   {
     "name": "@sentinel-rfp/database",
     "exports": {
       ".": "./dist/index.js",
       "./prisma": "./prisma"
     }
   }
   ```

4. **Build dependencies first:**
   ```bash
   # Build packages before apps
   pnpm build --filter="@sentinel-rfp/database"
   pnpm build --filter="@sentinel-rfp/api"
   ```

---

## Node/pnpm Issues

### pnpm Install Fails

**Symptom:**

```
ERR_PNPM_LOCKFILE_BREAKING_CHANGE
error: Unsupported node version
```

**Solutions:**

1. **Check Node version:**

   ```bash
   node --version
   # Should be >= 20.0.0

   # Upgrade if needed
   nvm install 20.11.0
   nvm use 20.11.0
   ```

2. **Check pnpm version:**

   ```bash
   pnpm --version
   # Should be >= 8.0.0

   # Upgrade if needed
   npm install -g pnpm@8.15.0
   ```

3. **Clear pnpm cache:**

   ```bash
   pnpm store prune
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

4. **Resolve lock file conflicts:**
   ```bash
   # If multiple developers have conflicting lock files
   pnpm install --fix-lockfile
   ```

---

### Module Not Found

**Symptom:**

```
Error: Cannot find module 'package-name'
error: missing: react@18.0.0
```

**Solutions:**

1. **Install missing dependency:**

   ```bash
   pnpm add package-name

   # Add to specific workspace
   pnpm add -w package-name

   # Add as dev dependency
   pnpm add -D package-name
   ```

2. **Check workspace configuration:**

   ```json
   {
     "pnpm": {
       "overrides": {
         "react": "18.2.0"
       }
     }
   }
   ```

3. **Reinstall all dependencies:**
   ```bash
   pnpm install --force
   ```

---

## API/Backend Issues

### API Server Won't Start

**Symptom:**

```
error: listen EADDRINUSE :::3001
Error: Failed to initialize application
```

**Solutions:**

1. **Check API logs:**

   ```bash
   cd apps/api
   pnpm dev

   # Look for initialization errors
   ```

2. **Verify environment variables:**

   ```bash
   # Check apps/api/.env has:
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=development-secret
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Test database connection:**

   ```bash
   # From apps/api
   pnpm prisma:validate

   # Or manually
   cd packages/database
   pnpm prisma:db:push
   ```

4. **Increase timeout for initialization:**
   ```bash
   # apps/api/src/main.ts
   const app = await NestFactory.create(AppModule);
   await new Promise(r => setTimeout(r, 5000)); // Wait 5s
   await app.listen(3001);
   ```

---

### Health Check Fails

**Symptom:**

```
GET /health → 503 Service Unavailable
{
  "status": "error",
  "info": {
    "database": { "status": "down" }
  }
}
```

**Solutions:**

1. **Check database connection:**

   ```bash
   # Test from apps/api
   pnpm prisma:db:validate
   ```

2. **Check Redis connection:**

   ```bash
   redis-cli PING
   # Should return: PONG

   # Or check via Docker
   docker exec sentinel-redis redis-cli PING
   ```

3. **View full health details:**

   ```bash
   curl http://localhost:3001/health -v
   ```

4. **Restart services:**

   ```bash
   # Stop API
   pnpm dev  # Ctrl+C

   # Wait 5 seconds
   sleep 5

   # Restart
   pnpm dev
   ```

---

### Slow API Responses

**Symptom:**

```
GET /proposals → 5000ms
Query is very slow
```

**Solutions:**

1. **Check database queries:**

   ```bash
   # Enable query logging
   # In apps/api/.env
   DATABASE_URL="postgresql://...?log=queries"

   # Or in code
   PrismaClient({ log: ['query'] })
   ```

2. **Add missing indexes:**

   ```bash
   # Check schema.prisma for indexes
   # Add if missing:
   model Proposal {
     @@index([organizationId])
     @@index([status])
   }

   # Run migration
   cd packages/database
   pnpm prisma:migrate:dev
   ```

3. **Optimize queries:**

   ```typescript
   // ❌ Slow - N+1 query
   const proposals = await prisma.proposal.findMany();
   for (const p of proposals) {
     p.sections = await prisma.proposalSection.findMany({
       where: { proposalId: p.id },
     });
   }

   // ✅ Fast - Single query with include
   const proposals = await prisma.proposal.findMany({
     include: { sections: true },
   });
   ```

4. **Paginate large queries:**

   ```typescript
   // ❌ Slow - load all records
   const all = await prisma.proposal.findMany({});

   // ✅ Fast - paginate
   const page1 = await prisma.proposal.findMany({
     skip: 0,
     take: 20,
   });
   ```

---

## Frontend Issues

### Frontend Server Won't Start

**Symptom:**

```
Error: Port 3000 is already in use
Error: Failed to compile
```

**Solutions:**

1. **Check port availability:**

   ```bash
   lsof -i :3000

   # Kill process or change port
   PORT=3002 pnpm dev
   ```

2. **Check for build errors:**

   ```bash
   cd apps/web
   pnpm dev

   # Look for compilation errors in logs
   ```

3. **Check environment variables:**

   ```bash
   # apps/web/.env should have:
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=development-secret
   ```

4. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   pnpm dev
   ```

---

### "Cannot find module" in Frontend

**Symptom:**

```
ModuleNotFoundError: No module named '@sentinel-rfp/shared'
error: Cannot find module 'react'
```

**Solutions:**

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Rebuild shared packages:**

   ```bash
   pnpm build --filter="@sentinel-rfp/shared"
   ```

3. **Check import paths:**

   ```typescript
   // ❌ Wrong
   import { User } from '../../../../../types';

   // ✅ Correct (check tsconfig.json paths)
   import { User } from '@sentinel-rfp/shared';
   ```

4. **Invalidate Next.js cache:**
   ```bash
   rm -rf .next node_modules
   pnpm install
   pnpm dev
   ```

---

### Styling Issues (Tailwind)

**Symptom:**

```
Styles not applied
Tailwind classes not working
```

**Solutions:**

1. **Check tailwind.config.js:**

   ```javascript
   module.exports = {
     content: ['./src/**/*.{js,ts,jsx,tsx}', './node_modules/@sentinel-rfp/**/*.{js,ts,jsx,tsx}'],
   };
   ```

2. **Rebuild Tailwind:**

   ```bash
   # Restart dev server
   pnpm dev

   # Or rebuild CSS
   pnpm build
   ```

3. **Check for conflicting CSS:**
   ```bash
   # Look for inline styles or conflicting CSS files
   grep -r "style=" apps/web/src/
   ```

---

## Authentication Problems

### Login Fails with Valid Credentials

**Symptom:**

```
Invalid email or password
JWT token not returned
```

**Solutions:**

1. **Verify user exists in database:**

   ```bash
   # Check database
   psql postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_rfp

   SELECT * FROM users WHERE email = 'test@example.com';
   ```

2. **Check password hashing:**

   ```typescript
   // Verify password is hashed (not plain text)
   // When creating user, always hash:
   const hash = await bcrypt.hash(password, 10);

   // When authenticating:
   const valid = await bcrypt.compare(password, user.passwordHash);
   ```

3. **Check JWT configuration:**

   ```bash
   # Verify in apps/api/.env:
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=1h
   ```

4. **Check CORS settings (if frontend separate):**
   ```typescript
   // apps/api/src/main.ts
   app.enableCors({
     origin: 'http://localhost:3000',
     credentials: true,
   });
   ```

---

### JWT Token Expired

**Symptom:**

```
Error: jwt expired
401 Unauthorized
```

**Solutions:**

1. **Increase token expiration for development:**

   ```bash
   # apps/api/.env
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   ```

2. **Use refresh token:**

   ```typescript
   // Check if using refresh token flow
   if (tokenExpired) {
     const newToken = await refreshToken(refreshToken);
     localStorage.setItem('token', newToken);
   }
   ```

3. **Verify token in storage:**

   ```javascript
   // Frontend console
   localStorage.getItem('token');

   // Decode to check expiration
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log(new Date(payload.exp * 1000));
   ```

---

## Performance Issues

### High Memory Usage

**Symptom:**

```
Memory usage > 1GB
npm ERR! errno: -2
```

**Solutions:**

1. **Increase Node heap:**

   ```bash
   NODE_OPTIONS=--max_old_space_size=4096 pnpm dev
   ```

2. **Find memory leaks:**

   ```bash
   # Use Node profiler
   node --inspect apps/api/dist/main.js

   # Open chrome://inspect in Chrome
   ```

3. **Check for circular dependencies:**
   ```bash
   pnpm install -g webpack-bundle-analyzer
   webpack-bundle-analyzer apps/web/.next/server
   ```

---

### Slow Test Execution

**Symptom:**

```
Test suite taking > 5 minutes
Tests timing out
```

**Solutions:**

1. **Run tests in parallel:**

   ```bash
   pnpm test -- --maxWorkers=4
   ```

2. **Skip slow tests during development:**

   ```typescript
   it.skip('slow integration test', async () => {
     // Only run in CI
   });
   ```

3. **Increase timeout:**

   ```bash
   jest.setTimeout(30000); // 30 seconds
   ```

4. **Use in-memory database for tests:**
   ```bash
   # Use SQLite for testing instead of PostgreSQL
   # Faster and isolated per test
   ```

---

## Getting Help

If you can't find the answer:

1. **Check project README:** `README.md` at project root
2. **Search GitHub issues:** [Issues](https://github.com/tjsasakifln/sentinel-rfp/issues)
3. **Check setup guide:** `docs/development/setup.md`
4. **Create new issue:** Include logs, environment info, steps to reproduce
5. **Ask in Slack:** #dev-sentinel-rfp channel

---

**Having another issue?** Create a GitHub issue with:

- Error message (full stack trace)
- Steps to reproduce
- Environment (OS, Node version, pnpm version)
- Relevant logs

---

**Next:** See [database.md](./database.md) for database-specific issues →
