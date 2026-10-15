-- Quartz additive user-data schema.
-- Prerequisite: existing Quartz auth table quartz_users(id).
-- Safe/idempotent: no DROP, rename, or changes to existing account rows.
BEGIN;

CREATE TABLE IF NOT EXISTS quartz_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES quartz_users(id) ON DELETE CASCADE,
  display_name VARCHAR(120) NOT NULL DEFAULT '',
  bio VARCHAR(1000) NOT NULL DEFAULT '',
  avatar_url TEXT,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quartz_settings (
  user_id BIGINT PRIMARY KEY REFERENCES quartz_users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quartz_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES quartz_users(id) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(300) NOT NULL,
  detail VARCHAR(2000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quartz_history_user_created_idx
  ON quartz_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quartz_files (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES quartz_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 10485760),
  storage_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quartz_files_user_created_idx
  ON quartz_files(user_id, created_at DESC);

COMMIT;
