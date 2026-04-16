-- Cloudflare D1 Schema for LunaTV
-- Run: wrangler d1 execute lunatv-db --file=./schema.sql --local

-- Users table (stores username and password hash)
CREATE TABLE IF NOT EXISTS users (
    user_name TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Play records table (stores user's video playback progress)
CREATE TABLE IF NOT EXISTS play_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_name, key)
);

CREATE INDEX IF NOT EXISTS idx_play_records_user ON play_records(user_name);

-- Favorites table (stores user's favorite videos)
CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_name, key)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_name);

-- Search history table (stores user's search keywords)
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    keyword TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_name, keyword)
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_name);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);

-- Admin config table (stores site configuration)
CREATE TABLE IF NOT EXISTS admin_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Skip configs table (stores intro/outro skip settings)
CREATE TABLE IF NOT EXISTS skip_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_name, key)
);

CREATE INDEX IF NOT EXISTS idx_skip_configs_user ON skip_configs(user_name);