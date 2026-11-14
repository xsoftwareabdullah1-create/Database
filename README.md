# Webbase — Backend Platform

<p align="center"><strong>A Firebase-style backend workspace for projects, authentication and JSON document data.</strong><br>Simple console · REST API · PostgreSQL · Self-hostable · Apache-2.0</p>

<p align="center">
<img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 20+">
<img src="https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
<img src="https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge" alt="MIT">
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
- Collections and JSON document CRUD
- Responsive dark dashboard for mobile and desktop
- PostgreSQL JSONB storage and repeatable schema setup
- Security headers, request-size limits and authentication rate limiting
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
| GET / POST | `/api/collections/:collectionId/documents` | List / create JSON documents |
| PUT / DELETE | `/api/documents/:documentId` | Update / delete a document |
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

Deploy the Node.js service to a host that supports persistent environment variables and connect it to a managed PostgreSQL instance. Set `DATABASE_URL`, a strong `JWT_SECRET`, `NODE_ENV=production`, and `PGSSL=true` when required by your provider. Serve the dashboard and API from the same origin or configure a deliberate CORS policy before splitting them.

For production use, configure HTTPS, database backups, email verification, password reset, audit logging and monitoring. Do not treat this starter as a fully managed cloud database service.

## Project structure

```text
Database/
├── public/
│   └── index.html
├── server.js
├── index.js
├── schema.sql
├── .env.example
├── .gitignore
├── package.json
└── LICENSE
```

## License

MIT — see [LICENSE](LICENSE).

<p align="center">Built and maintained by <strong>Abdullah</strong><br><sub>Copyright © 2026 Abdullah. All rights reserved except as permitted by the MIT License.</sub></p>
