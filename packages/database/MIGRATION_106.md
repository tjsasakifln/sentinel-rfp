# Migration #106: pgvector Setup & HNSW Indexes

## Overview

This migration configures PostgreSQL's pgvector extension and creates optimized HNSW (Hierarchical Navigable Small World) indexes for semantic similarity search.

**Issue:** [#106](https://github.com/tjsasakifln/sentinel-rfp/issues/106)
**Migration:** `20260112183458_pgvector_setup`

## What's Included

### 1. pgvector Extension

- Enables `vector` data type for storing embeddings
- Provides cosine similarity operators (`<=>`, `<->`, `<#>`)
- Required for semantic search functionality

### 2. HNSW Indexes

Two HNSW indexes for approximate nearest neighbor search:

```sql
-- DocumentChunk embeddings (document content search)
CREATE INDEX document_chunks_embedding_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- LibraryEntry embeddings (reusable content search)
CREATE INDEX library_entries_embedding_idx
  ON library_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Parameters:**

- `m = 16`: Maximum connections per node (balance: recall vs build time)
- `ef_construction = 64`: Dynamic candidate list size during build (higher = better quality, slower build)
- `vector_cosine_ops`: Uses cosine similarity (1 - cosine_similarity)

### 3. Filter Indexes

B-tree indexes for fast filtering before vector search:

```sql
-- Filter by document
CREATE INDEX document_chunks_document_id_idx
  ON document_chunks(document_id);

-- Filter by organization
CREATE INDEX library_entries_organization_id_idx
  ON library_entries(organization_id);

-- Filter by category (partial index for non-null)
CREATE INDEX library_entries_category_idx
  ON library_entries(category)
  WHERE category IS NOT NULL;
```

## Query Pattern

The indexes support this typical query pattern:

```sql
-- Semantic search with filters
SELECT *
FROM library_entries
WHERE organization_id = $1        -- Uses B-tree index
  AND category = $2               -- Uses B-tree index
ORDER BY embedding <=> $vector    -- Uses HNSW index
LIMIT 10;
```

**Execution plan:**

1. Filter rows using B-tree indexes (organization_id + category)
2. Apply HNSW approximate nearest neighbor search on filtered subset
3. Return top-K results

## Performance Targets

| Dataset Size | Expected P95 Latency |
| ------------ | -------------------- |
| 1K vectors   | <200ms               |
| 10K vectors  | <500ms               |
| 100K vectors | <1s                  |

## Testing the Migration

### Prerequisites

- Docker installed and running
- Node.js and npm installed

### Run Tests

```bash
cd packages/database

# Start PostgreSQL with pgvector
docker compose -f docker-compose.test.yml up -d

# Wait for database to be ready (5-10 seconds)
sleep 10

# Run Prisma migration
npx prisma migrate deploy

# Run validation script
./test-migration.sh
```

### Manual Verification

```bash
# Connect to database
docker exec -it sentinel-db-test psql -U sentinel -d sentinel_rfp

# Check extension
\dx vector

# List indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('document_chunks', 'library_entries')
ORDER BY indexname;

# Test vector query
SELECT id, title, embedding <=> array_fill(0.1::real, ARRAY[1536])::vector AS distance
FROM library_entries
WHERE organization_id = '...'
ORDER BY distance
LIMIT 5;
```

### Cleanup

```bash
# Stop and remove database
docker compose -f docker-compose.test.yml down -v
```

## Acceptance Criteria

- [x] pgvector extension installed
- [x] HNSW index created for DocumentChunk.embedding
- [x] HNSW index created for LibraryEntry.embedding
- [x] Filter indexes created (document_id, organization_id, category)
- [x] HNSW parameters optimized (m=16, ef_construction=64)
- [x] Migration SQL file created and documented
- [ ] Migration tested locally (requires Docker)
- [ ] Similarity query validated (<500ms)

## References

- [pgvector documentation](https://github.com/pgvector/pgvector)
- [HNSW algorithm paper](https://arxiv.org/abs/1603.09320)
- [Prisma pgvector guide](https://www.prisma.io/docs/orm/overview/databases/postgresql#enabling-extensions)
- Parent issue: [#19 - Prisma Schema Design](https://github.com/tjsasakifln/sentinel-rfp/issues/19)

## Maintenance Notes

### Index Rebuild

HNSW indexes auto-update on INSERT/UPDATE, but may need periodic rebuild after bulk imports:

```sql
-- Rebuild indexes if query performance degrades
REINDEX INDEX document_chunks_embedding_idx;
REINDEX INDEX library_entries_embedding_idx;
```

### Query Tuning

Adjust HNSW search parameters at query time:

```sql
-- Increase recall at cost of speed
SET hnsw.ef_search = 100;  -- Default: 40

-- Query with higher ef_search
SELECT * FROM library_entries
ORDER BY embedding <=> $vector
LIMIT 10;
```

### Monitoring

```sql
-- Check index size
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE indexname LIKE '%embedding%';

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE '%embedding%';
```
