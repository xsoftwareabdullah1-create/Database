# ◈ QUARTZ DATABASE

<p align="center">
  <strong>A clean, PostgreSQL-first data layer for the Quartz ecosystem.</strong><br>
  Additive schema · Repeatable migrations · JSONB settings · User-owned data
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Database-PostgreSQL%2016%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 16+">
  <img src="https://img.shields.io/badge/Runtime-Node.js%2020%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/License-MIT-00A86B?style=for-the-badge" alt="MIT License">
</p>

---

## ◈ Overview

**Quartz Database** is the schema and migration layer for storing user data alongside the existing Quartz authentication service. It extends the existing account database without trying to replace the authentication system.

The repository focuses on four things: profiles, application settings, activity history, and file metadata. It is designed to be understandable, repeatable, and safe to integrate into an existing Node.js service.

> **Design principle:** authentication stays with the Quartz auth service; this repository owns the additive user-data schema.

## ✦ Features

- **PostgreSQL-first** — built for PostgreSQL 16 and newer.
- **Additive migrations** — creates the Quartz data tables without dropping or renaming existing tables.
- **Repeatable setup** — uses `IF NOT EXISTS` for tables and indexes.
- **Structured settings** — stores flexible per-user preferences in PostgreSQL `JSONB`.
- **Activity history** — indexed by user and creation time for efficient recent-history queries.
- **File metadata** — stores file details and a storage key, while file bytes live in separate persistent storage.
- **Node.js integration** — exposes a small migration helper that accepts an existing `pg` Pool or compatible client.

## ◈ Architecture

```text
Quartz Application
       │
       ▼
Quartz Auth Service
       │  Existing connection / authenticated user
       ▼
PostgreSQL
       ├── quartz_users       Existing auth-owned table
       ├── quartz_sessions    Existing auth-owned table
       ├── quartz_profiles    User profile data
       ├── quartz_settings    User preferences (JSONB)
       ├── quartz_history     Activity records
       └── quartz_files       File metadata
```

The authentication service remains responsible for sessions and API authorization. This repository does not expose a public database endpoint or implement authentication.

## ◈ Schema

| Table | Purpose | Important fields |
| --- | --- | --- |
| `quartz_profiles` | One profile per user | `user_id`, `display_name`, `bio`, `avatar_url`, `timezone` |
| `quartz_settings` | Per-user application settings | `user_id`, `settings JSONB` |
| `quartz_history` | User activity/history | `id`, `user_id`, `kind`, `title`, `metadata`, `created_at` |
| `quartz_files` | Uploaded-file metadata | `id`, `user_id`, `name`, `mime_type`, `size_bytes`, `storage_key` |

All four tables reference the existing `quartz_users(id)` key. User-owned rows are removed when their referenced user is deleted.

### File storage boundary

The `quartz_files` table stores metadata only. It does **not** store uploaded file bytes. Keep actual files in a persistent volume or object-storage service, and authorize every upload and download in the application layer.

The database constraint currently limits an individual file record to **10 MiB**. Enforce total per-user quotas in the upload service as well.

## ⚡ Quick start

### Requirements

- PostgreSQL 16+
- Node.js 20+
- An existing Quartz auth schema containing `quartz_users(id)` with a BIGINT-compatible key
- The `pg` package in the host application

### 1. Install the PostgreSQL driver

In the Quartz service:

```bash
npm install pg
```

### 2. Configure the database connection

Set `DATABASE_URL` in your deployment environment. Never commit a real connection string or password.

### 3. Apply the SQL migration

Back up the database first, then run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_user_data.sql
```

### 4. Or use the Node.js migration helper

```js
const { Pool } = require('pg');
const { migrate } = require('./index');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false
});

async function setupDatabase() {
  try {
    const result = await migrate(pool);
    console.log('Quartz database migration:', result);
  } finally {
    await pool.end();
  }
}

setupDatabase().catch((error) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
```

Use the SSL settings required by your database provider. Do not disable certificate verification in production.

## ◈ Repository map

```text
Database/
├── docs/
│   └── SELF_HOSTING.md
├── migrations/
│   └── 001_user_data.sql
├── index.js
├── package.json
├── LICENSE
└── README.md
```

## 🔐 Security

- Keep database URLs, passwords, session secrets, and API keys out of Git.
- Use environment variables or your hosting provider's secret manager.
- Keep PostgreSQL private; do not expose its port to the public internet.
- Authenticate users in the Quartz service and authorize every data operation by the authenticated user ID.
- Validate file names, MIME types, file sizes, and storage keys in the application.
- Use encrypted backups stored separately from the database host.
- Apply least-privilege database credentials to the running service.

## ♻️ Backups, restore & self-hosting

Read **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)** for backup and restore commands, deployment notes, migration prerequisites, and rollback guidance.

A backup is not verified until it has been successfully restored and checked. Do not treat an expiring free database instance as permanent production storage.

## ⚠️ Important notes

- This repository is a **database schema and migration package**, not a hosted database service.
- It does not create the original `quartz_users` or session tables.
- Apply the migration only after confirming the existing auth table and key type.
- The SQL migration is wrapped in a transaction and is safe to re-run for the objects it manages.
- Review migrations and take a backup before applying them to production.
- The Node helper expects the host service's existing PostgreSQL schema and connection.

## ✦ Roadmap

- [ ] Add automated PostgreSQL migration tests
- [ ] Add schema version tracking
- [ ] Add typed query helpers
- [ ] Add configurable history-retention tooling
- [ ] Add integration examples for the Quartz service

## 📄 License

Released under the **MIT License**. See [LICENSE](LICENSE).

---

<p align="center">
  Built and maintained by <strong>Abdullah</strong><br>
  <sub>Copyright © 2026 Abdullah. All rights reserved except as permitted by the MIT License.</sub>
</p>
