-- Updated 2026-02-12 for code-first schema generation
-- Only create extensions here. Tables are created by backend/scripts/create_all_from_models.py
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Create audit schema (also handled by python script, but good to have)
CREATE SCHEMA IF NOT EXISTS audit;