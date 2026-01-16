-- AlreadyExecuted: true
-- Migration: pgvector_setup
-- Created at: 2026-01-12 18:34:58
-- Issue: #106 - Configure pgvector extension and HNSW indexes

-- ==========================================
-- PGVECTOR EXTENSION
-- ==========================================

-- Enable pgvector extension for vector similarity search
-- This extension provides vector data type and similarity operators
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- HNSW INDEXES FOR VECTOR SIMILARITY SEARCH
-- ==========================================

-- HNSW (Hierarchical Navigable Small World) is an approximate nearest neighbor algorithm
-- Optimized for high-dimensional vector search with sub-linear time complexity
-- Parameters:
--   m = 16              : Maximum number of connections per node (trade-off: recall vs build time)
--   ef_construction = 64: Size of dynamic candidate list during index construction (higher = better quality, slower build)
-- Distance operator: vector_cosine_ops (1 - cosine similarity)

-- Index for DocumentChunk embeddings (semantic search on document content)
-- Only create if table exists (table created in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks') THEN
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  END IF;
END $$;

-- Index for LibraryEntry embeddings (semantic search on reusable content)
-- Only create if table exists (table created in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'library_entries') THEN
    CREATE INDEX IF NOT EXISTS library_entries_embedding_idx
      ON library_entries
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  END IF;
END $$;

-- ==========================================
-- FILTER INDEXES (B-tree)
-- ==========================================

-- These indexes support fast filtering before vector similarity search
-- Pattern: Filter by organization/category/document → then vector search on subset

-- DocumentChunk filters
-- Only create if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks') THEN
    CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
      ON document_chunks(document_id);
  END IF;
END $$;

-- LibraryEntry filters
-- Only create if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'library_entries') THEN
    CREATE INDEX IF NOT EXISTS library_entries_organization_id_idx
      ON library_entries(organization_id);

    CREATE INDEX IF NOT EXISTS library_entries_category_idx
      ON library_entries(category)
      WHERE category IS NOT NULL; -- Partial index for non-null categories
  END IF;
END $$;

-- ==========================================
-- PERFORMANCE NOTES
-- ==========================================

-- Expected query pattern:
-- SELECT * FROM library_entries
-- WHERE organization_id = $1 AND category = $2
-- ORDER BY embedding <=> $embedding_vector
-- LIMIT 10;
--
-- Query plan will use:
-- 1. B-tree indexes to filter by organization_id + category
-- 2. HNSW index for approximate nearest neighbor search on filtered subset
-- 3. Expected P95 latency: <500ms for 10K vectors, <200ms for 1K vectors

-- Maintenance:
-- HNSW indexes auto-update on INSERT/UPDATE
-- Periodic REINDEX may be needed after bulk imports (>10K documents)
