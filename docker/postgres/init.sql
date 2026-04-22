-- PostgreSQL initialization script for MoviePlatform
-- This runs on first database creation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Create schema for better organization (optional, Prisma uses public by default)
-- CREATE SCHEMA IF NOT EXISTS app;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE movieplatform TO movieplatform;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'MoviePlatform database initialized successfully';
END $$;
