#!/bin/bash
# Test script for pgvector migration (#106)
# Run this after starting PostgreSQL with docker-compose.test.yml

set -e

echo "🔧 Testing pgvector migration..."

# Navigate to package directory
cd "$(dirname "$0")"

# 1. Start PostgreSQL with pgvector
echo "📦 Starting PostgreSQL with pgvector..."
docker compose -f docker-compose.test.yml up -d
sleep 5

# 2. Wait for database to be ready
echo "⏳ Waiting for database..."
until docker exec sentinel-db-test pg_isready -U sentinel -d sentinel_rfp; do
  echo "Waiting for database to be ready..."
  sleep 2
done

# 3. Run Prisma migration
echo "🚀 Running Prisma migrations..."
npx prisma migrate deploy

# 4. Verify pgvector extension
echo "✅ Verifying pgvector extension..."
docker exec sentinel-db-test psql -U sentinel -d sentinel_rfp -c "\dx vector"

# 5. Verify HNSW indexes
echo "✅ Verifying HNSW indexes..."
docker exec sentinel-db-test psql -U sentinel -d sentinel_rfp -c "
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%embedding%'
ORDER BY indexname;
"

# 6. Verify filter indexes
echo "✅ Verifying filter indexes..."
docker exec sentinel-db-test psql -U sentinel -d sentinel_rfp -c "
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'document_chunks_document_id_idx',
  'library_entries_organization_id_idx',
  'library_entries_category_idx'
)
ORDER BY indexname;
"

# 7. Test vector similarity query
echo "✅ Testing vector similarity query..."
docker exec sentinel-db-test psql -U sentinel -d sentinel_rfp -c "
-- Create test data
INSERT INTO organizations (id, name, slug, plan, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Org', 'test-org', 'PROFESSIONAL', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO library_entries (id, title, content, category, tags, embedding, organization_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Entry 1', 'This is test content 1', 'technical', ARRAY['test'], array_fill(0.1::real, ARRAY[1536])::vector, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'Test Entry 2', 'This is test content 2', 'technical', ARRAY['test'], array_fill(0.2::real, ARRAY[1536])::vector, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'Test Entry 3', 'This is test content 3', 'business', ARRAY['test'], array_fill(0.3::real, ARRAY[1536])::vector, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Test similarity query with filter
EXPLAIN ANALYZE
SELECT id, title, category, embedding <=> array_fill(0.15::real, ARRAY[1536])::vector AS distance
FROM library_entries
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  AND category = 'technical'
ORDER BY embedding <=> array_fill(0.15::real, ARRAY[1536])::vector
LIMIT 5;
"

echo ""
echo "✅ All tests passed!"
echo ""
echo "📊 Performance notes:"
echo "  - Check EXPLAIN ANALYZE output above"
echo "  - Target: <500ms for queries on 10K vectors"
echo "  - Target: <200ms for queries on 1K vectors"
echo ""
echo "🧹 Cleanup:"
echo "  docker compose -f docker-compose.test.yml down -v"
