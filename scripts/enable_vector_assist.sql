-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
-- Enable Google ML Integration extension
CREATE EXTENSION IF NOT EXISTS google_ml_integration;
-- Verify installation
SELECT extname,
    extversion
FROM pg_extension
WHERE extname IN ('vector', 'google_ml_integration');
-- Example usage to verify functionality (will fail if IAM roles not granted or API disabled)
-- SELECT embedding('text-embedding-004', 'Hello world');