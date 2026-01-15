-- Sentinel RFP - PostgreSQL Initialization Script
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Enable pgvector extension for vector storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify pgvector installation
SELECT extversion FROM pg_extension WHERE extname = 'vector';

-- Create helper function for vector similarity (if not exists)
-- Cosine similarity: 1 - cosine distance
CREATE OR REPLACE FUNCTION vector_cosine_similarity(a vector, b vector)
RETURNS float
AS $$
  SELECT 1 - (a <=> b);
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'pgvector extension enabled successfully';
  RAISE NOTICE 'Vector type vector(1536) available for OpenAI embeddings';
  RAISE NOTICE 'Cosine similarity helper function created';
END $$;
