# Webbase — Backend Platform

<p align="center"><strong>A Firebase-style backend workspace for projects, authentication and JSON document data.</strong><br>Simple console · REST API · PostgreSQL · Self-hostable · Apache-2.0</p>

<p align="center">
<img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 20+">
<img src="https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
<img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge" alt="Apache-2.0">
</p>

## Overview

Webbase is a self-hosted backend starter inspired by the workflow of Firebase. It provides a browser console and a Node.js REST API backed by PostgreSQL. Create projects, group data into collections, and store JSON documents without writing SQL for everyday CRUD operations.

**This is an independent project, not an official Firebase product or a drop-in Firebase replacement.**

## Website

- Public landing page: `/`
- Developer Console: `/console` (sign up, sign in, projects, collections and JSON documents)

## Features

- Email/password account registration and login
- JWT-based authenticated API requests
- Private projects scoped to the signed-in account
- Project app registration for Android, iOS, Flutter and web clients
- Project API key creation, hashed-at-rest storage, one-time secret display and revocation
- Collection-level security rules with deny-by-default client permissions
- API-key-authenticated client data routes that enforce read/create/update/delete rules
- Collections and JSON document CRUD
- JavaScript, Android/Kotlin and Flutter/Dart starter clients for document CRUD
- Responsive dark dashboard for mobile and desktop
- PostgreSQL JSONB storage and repeatable schema setup
- Security headers, request-size limits, authentication/client API rate limits and configurable CORS allowlist
- REST API health endpoint and built-in endpoint guide

## Architecture

```text
Browser Console
      │ same-origin JSON requests
      ▼
Express REST API ── JWT authentication
      │
      ▼
PostgreSQL
  ├── app_users
  ├── projects
  ├── collections
  └── documents (JSONB)
```

## Requirements

- Node.js 20+
- PostgreSQL 14+ (PostgreSQL 16+ recommended)
- npm

## Run locally

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database named `webbase`.

3. Copy `.env.example` to `.env` and set `DATABASE_URL` plus a random `JWT_SECRET` (at least 32 characters).

4. Start the application:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000`, create an account and create your first project.

The server creates the required tables automatically on startup. You can also review and run `schema.sql` manually.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random secret, minimum 32 characters |
| `PORT` | No | HTTP port (default 3000) |
| `NODE_ENV` | No | Set to `production` when deployed |
| `PGSSL` | No | Set `true` if your database provider requires verified TLS |
| `WEBBASE_CORS_ORIGINS` | No | Comma-separated allowlist of browser origins that may call the API |

Never commit `.env` or expose database credentials in browser code.

## API

All protected endpoints require `Authorization: Bearer YOUR_TOKEN`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/me` | Current account |
| GET / POST | `/api/projects` | List / create projects |
| DELETE | `/api/projects/:projectId` | Delete owned project |
| GET / POST | `/api/projects/:projectId/collections` | List / create collections |
| GET / POST | `/api/collections/:collectionId/documents` | Owner list / create JSON documents |
| PUT / DELETE | `/api/documents/:documentId` | Owner update / delete a document |
| GET / POST / DELETE | `/api/projects/:projectId/apps` and `/api/projects/:projectId/apps/:appId` | Register, list and remove apps |
| GET / POST / DELETE | `/api/projects/:projectId/api-keys` and `/api/projects/:projectId/api-keys/:keyId` | Create, list and revoke API keys |
| GET | `/api/projects/:projectId/security-rules` | List collection rules |
| PUT / DELETE | `/api/projects/:projectId/security-rules/:collectionName` | Set / reset collection rules |
| GET / POST | `/api/client/:projectId/collections/:collectionName/documents` | API-key client read / create (rule required) |
| PUT / DELETE | `/api/client/:projectId/documents/:documentId` | API-key client update / delete (rule required) |
| GET | `/api/health` | Service and database health |

Example document payload:

```json
{
  "data": {
    "displayName": "Ada Lovelace",
    "active": true
  }
}
```

## Deployment

The application serves the landing page, developer console and REST API from one Express origin. This avoids browser CORS configuration for the built-in console. Set `DATABASE_URL`, a strong `JWT_SECRET`, `NODE_ENV=production`, and `PGSSL=true` only when your PostgreSQL provider requires verified TLS. Never expose database credentials or the JWT secret in browser code.

## One-click public deployment (Render)

Webbase includes a Render Blueprint at [render.yaml](render.yaml) that provisions the Node.js web service and a PostgreSQL database, generates a private `JWT_SECRET`, runs the project checks during the build, and configures `/api/health` as the service health check.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/xsoftwareabdullah1-create/Database)

1. Open the Deploy to Render link and sign in to Render.
2. Review the Blueprint resources and approve creation of the Webbase service and PostgreSQL database.
3. Wait for the first build and deployment to finish. Render will assign a public HTTPS `.onrender.com` URL.
4. Open that URL, create an account, then open `/api/health`. A healthy response reports both the service and database as connected.

The Blueprint currently uses Render's free plans to avoid committing you to a paid service. **Free Render web services sleep after inactivity, and free PostgreSQL databases expire after 30 days (1 GB limit). They are for testing/hobby use, not production or long-term storage.** Upgrade the database before storing important data, and configure backups before production use. See [Render's free-instance limits](https://render.com/docs/free).

The repository itself is already public on GitHub. The hosted application becomes public only after you approve the Render Blueprint and its deployment succeeds. No database password or JWT secret is committed to this repository; Render generates the JWT secret and wires the database connection privately.


For production use, configure HTTPS, database backups, email verification, password reset, audit logging and monitoring. Do not treat this starter as a fully managed cloud database service.

## Project structure

```text
Database/
├── public/
│   ├── index.html
│   └── console.html
├── sdk/
│   ├── webbase.mjs
│   ├── android/WebbaseClient.kt
│   └── flutter/lib/webbase_client.dart
├── scripts/check-client.js
├── server.js
├── index.js
├── schema.sql
├── .env.example
├── .gitignore
├── package.json
└── LICENSE
```

## Client SDKs

The repository includes lightweight clients for the public document API:

- JavaScript: `sdk/webbase.mjs` — import `createWebbaseClient` and call `client.collection('tasks').list()`, `.create(data)`, `.update(id, data)` or `.delete(id)`.
- Android/Kotlin: `sdk/android/WebbaseClient.kt` — use `list`, `create`, `update` and `delete` from a background thread. It uses Android's `org.json` classes.
- Flutter/Dart: `sdk/flutter/lib/webbase_client.dart` — add `http: ^1.2.0` to the app and use the same CRUD methods.

All SDKs need the Webbase base URL, project ID and project API key. They are starter source files, not published Maven, pub.dev or npm packages. Client APIs only provide JSON document CRUD; end-user authentication, file storage, realtime, functions and hosting are not implemented yet.

## Security rules

Client API access is denied unless a project owner explicitly enables the relevant operation for a collection. Rules are booleans: `read`, `create`, `update`, and `delete`. For example, send `PUT /api/projects/PROJECT_ID/security-rules/tasks` with an owner session and `{ "rules": { "read": true, "create": true } }` to allow clients to read and create documents in `tasks`; update and delete remain denied. Client requests send the project API key in the `x-webbase-key` header. Treat these as public client keys, not server secrets, and use restrictive rules.

## License

Apache License 2.0 — see [LICENSE](LICENSE).

<p align="center">Built and maintained by <strong>Abdullah</strong><br><sub>Copyright © 2026 Abdullah. Licensed under Apache-2.0.</sub></p>


## GitHub Pages preview

The static website preview is published with GitHub Pages from `public/`. Once the Pages workflow completes, open:

- https://xsoftwareabdullah1-create.github.io/Database/
- Console UI preview: https://xsoftwareabdullah1-create.github.io/Database/console.html

**Important:** GitHub Pages only serves static files. Authentication, project creation, API requests and PostgreSQL-backed data require the Render backend described above. The console preview includes a notice about this limitation.
