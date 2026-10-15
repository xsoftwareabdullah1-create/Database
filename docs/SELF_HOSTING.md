# Self-hosting, backup and migration

## Free-tier reality

Render's current Quartz PostgreSQL instance is a Free resource and its dashboard shows an expiry date. Do not treat it as permanent production storage or as an offsite backup. Free plans have storage, connection, sleep/availability, and retention constraints that can change; check the provider dashboard before relying on them.

A low-cost self-hosted setup can use one VPS or an existing always-on computer with PostgreSQL 16+, a persistent disk, firewall, updates and encrypted offsite backups. A single server is not high availability. Keep PostgreSQL off the public internet; use a private network or localhost and TLS when connecting across hosts.

Suggested initial limits for a small deployment:
- Maximum individual file: 10 MiB (database metadata check constraint).
- Start with 100 MiB total uploaded bytes per account; enforce this in the upload service, not just SQL.
- Limit history retention or paginate results as usage grows.
- Alert on disk space, database size and age of last successful backup.

## Backup and verify

Use PostgreSQL client tools from a trusted machine. Set connection URLs securely in the shell; do not paste credentials into source control or chat.

```sh
umask 077
pg_dump --format=custom --no-owner --no-privileges "$SOURCE_DATABASE_URL" --file "quartz-$(date +%F-%H%M).dump"
pg_restore --list quartz-YYYY-MM-DD-HHMM.dump >/dev/null
sha256sum quartz-YYYY-MM-DD-HHMM.dump
```

Replace the example dump filename with the actual filename. Store the dump encrypted and separate from the source host. Back up uploaded file bytes separately from PostgreSQL metadata.

## Restore to a new target

1. Create a new empty PostgreSQL database; do not restore over the source.
2. Restore the dump:

```sh
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$TARGET_DATABASE_URL" quartz-YYYY-MM-DD-HHMM.dump
```

3. Compare important table counts, including `quartz_users`, `quartz_sessions`, and the new data tables. Test login and read/write behavior with a test account.
4. Switch the auth service's `DATABASE_URL` only after validation. Keep the source database unchanged until the target has passed checks.
5. Take a fresh backup from the target and test restoring it. A backup is proven only after a restore test.

## App configuration

The auth service needs `DATABASE_URL`, `SESSION_SECRET` (at least 32 characters), `QUARTZ_WEB_URL`, and `QUARTZ_PUBLIC_URL` (or the Render-provided external URL). Configure email provider and Google OAuth settings separately. Keep secrets in deployment environment settings.

Rollback: switch traffic/configuration back to the original service only after considering whether writes occurred on the new target. If new writes happened, reconcile them first rather than silently losing them.
