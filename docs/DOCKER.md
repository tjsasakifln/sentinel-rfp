# Docker Development Environment - Sentinel RFP

## Overview

This project uses Docker Compose to provide a consistent development environment with all required external services:

- **PostgreSQL 16** with pgvector extension for vector embeddings
- **Redis 7** for caching and BullMQ job queues
- **Meilisearch 1.6** for full-text search

## Prerequisites

- **Docker Desktop** installed and running
- **Git** for version control
- **Node.js** 20+ and **pnpm** 8+ (for running the application)

## Quick Start

### 1. Start All Services

```bash
# Using npm script (recommended)
pnpm docker:up

# Or use the initialization script (includes health checks)
bash scripts/docker-up.sh

# Or use Docker Compose directly
docker-compose up -d
```

### 2. Verify Services

```bash
# Check service status
pnpm docker:ps

# View logs
pnpm docker:logs
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update the credentials if needed:

```bash
cp .env.example .env
```

The default credentials match the Docker configuration:

- PostgreSQL: `sentinel_user / sentinel_password`
- Redis: No auth (localhost only)
- Meilisearch: `sentinel_meili_master_key_dev_only`

## Available npm Scripts

| Script                | Command                     | Description                      |
| --------------------- | --------------------------- | -------------------------------- |
| `pnpm docker:up`      | `docker-compose up -d`      | Start all services in background |
| `pnpm docker:down`    | `docker-compose down`       | Stop all services                |
| `pnpm docker:restart` | `docker-compose restart`    | Restart all services             |
| `pnpm docker:logs`    | `docker-compose logs -f`    | Follow logs from all services    |
| `pnpm docker:ps`      | `docker-compose ps`         | Show service status              |
| `pnpm docker:clean`   | `docker-compose down -v`    | Stop services and remove volumes |
| `pnpm docker:init`    | `bash scripts/docker-up.sh` | Initialize with health checks    |

## Service URLs

Once services are running:

| Service     | URL                     | Credentials                                                                          |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------ |
| PostgreSQL  | `localhost:5432`        | user: `sentinel_user`<br/>password: `sentinel_password`<br/>database: `sentinel_rfp` |
| Redis       | `localhost:6379`        | No authentication (localhost only)                                                   |
| Meilisearch | `http://localhost:7700` | master key: `sentinel_meili_master_key_dev_only`                                     |

## PostgreSQL with pgvector

The PostgreSQL container includes the **pgvector** extension for vector similarity search.

### Verify pgvector Installation

Connect to PostgreSQL:

```bash
docker-compose exec postgres psql -U sentinel_user -d sentinel_rfp
```

Check extension:

```sql
SELECT extversion FROM pg_extension WHERE extname = 'vector';
```

### Example Usage

```sql
-- Create table with vector column
CREATE TABLE document_chunks (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536)  -- OpenAI embedding dimension
);

-- Create HNSW index for fast similarity search
CREATE INDEX ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Query similar vectors
SELECT content, 1 - (embedding <=> '[0.1, 0.2, ...]') as similarity
FROM document_chunks
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 10;
```

## Data Persistence

All data is persisted in named Docker volumes:

- `sentinel_postgres_data` - PostgreSQL database
- `sentinel_redis_data` - Redis persistence
- `sentinel_meilisearch_data` - Meilisearch indexes

To remove all data and start fresh:

```bash
pnpm docker:clean
```

## Customization

### Local Overrides

Create or edit `docker-compose.override.yml` to customize services locally:

```yaml
version: '3.9'

services:
  postgres:
    # Use different port if 5432 is busy
    ports:
      - '5433:5432'

  redis:
    # Increase memory limit
    command: redis-server --maxmemory 1gb
```

The `docker-compose.override.yml` file is loaded automatically by Docker Compose.

### Windows Users

Use the batch script instead of bash:

```cmd
scripts\docker-up.bat
```

## Troubleshooting

### Services Not Starting

1. Check if Docker Desktop is running
2. Ensure ports are not already in use (5432, 6379, 7700)
3. Check logs: `pnpm docker:logs`

### Port Conflicts

If ports are already in use, edit `docker-compose.override.yml`:

```yaml
services:
  postgres:
    ports:
      - '5433:5432' # Use 5433 instead of 5432
```

Then update `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://sentinel_user:sentinel_password@localhost:5433/sentinel_rfp
```

### Reset Everything

To completely reset the environment:

```bash
# Stop and remove all containers and volumes
pnpm docker:clean

# Start fresh
pnpm docker:up
```

## Health Checks

All services include health checks:

- **PostgreSQL**: `pg_isready` check every 10s
- **Redis**: `PING` command every 10s
- **Meilisearch**: HTTP health endpoint every 10s

Services will report healthy once they're ready to accept connections.

## Next Steps

After Docker services are running:

1. Run database migrations: `pnpm -F @sentinel/database migrate:dev`
2. Seed test data: `pnpm -F @sentinel/database seed`
3. Start backend: `pnpm -F @sentinel/api dev`
4. Start frontend: `pnpm -F @sentinel/web dev`

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Redis Docker](https://hub.docker.com/_/redis)
- [Meilisearch Docker](https://www.meilisearch.com/docs/learn/getting_started/installation#docker)
