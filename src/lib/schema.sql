-- Cloudflare D1 Schema for LunaTV
-- Run with: wrangler d1 execute <database_name> --file=./src/lib/schema.sql --local (for local)
-- Run with: wrangler d1 execute <database_name> --file=./src/lib/schema.sql --remote (for remote)

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
