# Rentify Property Rental Platform

Rentify is a full-stack property rental application for managing rental listings, tenancy workflows, payments, and communication between tenants, landlords, and administrators.

## Overview

The platform combines a public-facing property marketplace with role-based dashboards for different user types:

- Tenants can browse properties, schedule visits, submit rent requests, and track lease activity.
- Landlords can manage property listings, review applications, and handle rental operations.
- Admins can oversee listings, user activity, and platform-level workflows.

## Features

- Property listing and detail pages
- Search and browsing experience for available homes
- Booking and visit management
- Rent request handling and approval flows
- Wallet, transactions, and withdrawal tracking
- Real-time chat and notifications
- File uploads for property images and supporting documents
- Dashboard views for tenant, landlord, and admin roles
- Prisma-based data modeling with PostgreSQL and Redis support

## Tech Stack

- Frontend: React, TypeScript, Vite, Chakra UI, TanStack Query
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- Cache / job processing: Redis, BullMQ
- ORM: Prisma
- Containerization: Docker Compose

## Repository Structure

- `frontend/` — Vite React app for the user interface
- `server/` — Express API, Prisma schema, and business logic
- `docker-compose.yml` — local infrastructure for PostgreSQL, Redis, backend, and frontend
- `.env.example` — base environment template

## Prerequisites

Before running the project locally, make sure you have:

- Node.js 20+
- npm
- Docker and Docker Compose
- PostgreSQL access if running the backend outside containers

## Quick Start with Docker

1. Create a local environment file from the example:

   ```bash
   cp .env.example .env
   ```

2. Review the values in `.env` and update secrets as needed.
3. Start the full stack:

   ```bash
   docker compose up --build
   ```

4. Open the app in a browser:
   - Frontend: http://localhost:5000
   - Backend API: http://localhost:7000

The Docker setup starts PostgreSQL, Redis, the backend service, and the frontend service together.

## Manual Local Setup

If you prefer to run the frontend and backend directly:

### Backend

```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Make sure PostgreSQL is running and that `DATABASE_URL` in the backend environment points to a valid database.

## Environment Variables

The root `.env` file is used by Docker Compose. Key variables include:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `PORT`
- `NODE_ENV`
- `FRONTEND_URL`
- `VITE_BACKEND_URL`
- `VITE_FILE_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `EMAIL_HOST`
- `EMAIL_USER`
- `EMAIL_PASS`

For backend-only local development, the `server/.env` file can also be used with the same values expected by the application.

## Useful Commands

```bash
# Start containers
docker compose up

# Rebuild services after dependency changes
docker compose up --build

# Stop services
docker compose down

# Remove volumes (database reset)
docker compose down -v
```

## Notes

- Static uploaded files are served from the backend under `/uploads`.
- The project uses Prisma migrations and schema files under `server/prisma/`.

This project is intended as a property rental and tenancy management platform with modular feature areas that can be extended as the business grows.
