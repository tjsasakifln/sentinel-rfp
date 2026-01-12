# @sentinel/database

Database layer for Sentinel RFP using Prisma ORM with PostgreSQL and pgvector.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Database URL

Create a `.env` file in this directory:

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`.

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Run Migrations

```bash
# Development (creates migration files)
pnpm db:migrate:dev

# Production (applies existing migrations)
pnpm db:migrate:deploy
```

### 5. Seed Database (Optional)

```bash
pnpm db:seed
```

## Available Scripts

| Script                   | Description                                |
| ------------------------ | ------------------------------------------ |
| `pnpm build`             | Compile TypeScript to dist/                |
| `pnpm dev`               | Watch mode for development                 |
| `pnpm typecheck`         | Type-check without emitting files          |
| `pnpm db:generate`       | Generate Prisma Client from schema         |
| `pnpm db:push`           | Push schema changes (no migrations)        |
| `pnpm db:migrate:dev`    | Create and apply migrations (development)  |
| `pnpm db:migrate:deploy` | Apply migrations (production)              |
| `pnpm db:studio`         | Open Prisma Studio (GUI for database)      |
| `pnpm db:seed`           | Run seed script                            |
| `pnpm db:reset`          | Reset database (drop all data and re-seed) |
| `pnpm prisma:format`     | Format schema.prisma file                  |
| `pnpm prisma:validate`   | Validate schema.prisma file                |

## Usage in Other Packages

### 1. Add as Dependency

In your app's `package.json`:

```json
{
  "dependencies": {
    "@sentinel/database": "workspace:*"
  }
}
```

### 2. Import and Use

```typescript
import { PrismaClient } from '@sentinel/database';
import type { SystemConfig } from '@sentinel/database';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'app_version' },
  });

  console.log('App version:', config?.value);
}
```

### 3. Use Singleton Client (Recommended)

```typescript
import { prisma, checkDatabaseHealth } from '@sentinel/database/client';

// Check health
const healthy = await checkDatabaseHealth();

// Use client
const configs = await prisma.systemConfig.findMany();
```

## Schema Structure

The Prisma schema is organized into logical domains:

- **Identity**: Organizations, Users, Roles (Issue #103)
- **Proposals**: RFPs, Sections, Questions, Responses (Issue #104)
- **Knowledge**: Documents, Chunks, Library Entries (Issue #105)
- **Vectors**: pgvector indexes and search (Issue #106)

See `prisma/schema.prisma` for the complete schema definition.

## Development Workflow

### Making Schema Changes

1. Edit `prisma/schema.prisma`
2. Format and validate:
   ```bash
   pnpm prisma:format
   pnpm prisma:validate
   ```
3. Create migration:
   ```bash
   pnpm db:migrate:dev --name describe_your_change
   ```
4. Regenerate client:
   ```bash
   pnpm db:generate
   ```

### Prisma Studio (Database GUI)

```bash
pnpm db:studio
```

Opens at http://localhost:5555

## PostgreSQL Extensions

### pgvector

The schema is configured to use pgvector for semantic search:

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}
```

Ensure pgvector is installed in your PostgreSQL instance:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Environment Variables

| Variable       | Description                    | Required |
| -------------- | ------------------------------ | -------- |
| `DATABASE_URL` | PostgreSQL connection string   | Yes      |
| `NODE_ENV`     | Environment (development/prod) | No       |

## Troubleshooting

### "Cannot find module '@prisma/client'"

Run `pnpm db:generate` to generate the Prisma Client.

### Migration conflicts

If you have migration conflicts, you can reset the database (⚠️ **deletes all data**):

```bash
pnpm db:reset
```

### Type errors after schema changes

Regenerate Prisma Client and rebuild:

```bash
pnpm db:generate
pnpm build
```

## Related Issues

- #19 - Parent issue (Prisma Schema Design)
- #103 - Identity models (Organization, User)
- #104 - Proposal models
- #105 - Knowledge models
- #106 - pgvector configuration
- #107 - Seed script
- #108 - Initial migration

## References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
