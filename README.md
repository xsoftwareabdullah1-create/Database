# Quartz Database

A standalone, PostgreSQL-first data layer for Quartz. This repository owns the additive schema and migration documentation; the Quartz auth service remains responsible for session authentication and API authorization.

## Scope

- Existing account/auth tables are owned by the Quartz auth service and are not recreated here.
- Additive tables: `quartz_profiles`, `quartz_settings`, `quartz_history`, `quartz_files`.
- Foreign keys reference the existing `quartz_users(id)` table.
- PostgreSQL 16+ recommended.

## Apply migration

Back up the database first. Then, using a trusted environment and the intended database connection:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_user_data.sql
```

The migration uses `CREATE TABLE/INDEX IF NOT EXISTS` only. It does not drop or rename tables or modify existing user rows. Review the SQL and confirm that your existing auth schema uses `quartz_users(id)` as a BIGINT-compatible key before applying it.

## API ownership

The Quartz auth service exposes session-protected endpoints for these tables. This repository is the schema/migration source of truth; it is not a public database server and must never contain production database URLs, passwords, session secrets, or API keys.

## File storage

`quartz_files` stores file metadata and an internal `storage_key`, not file bytes. Configure a separate persistent volume or object store, enforce per-user quotas, and authorize downloads through the application.

## Backup and self-hosting

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for backup, restore, free-tier limits, migration and rollback guidance.
