# Development Environment Setup

This guide walks you through setting up the Student Budget and Expense Tracking System for local development.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone the Repository](#clone-the-repository)
- [Install Dependencies](#install-dependencies)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Seed the Database](#seed-the-database)
- [Start the Development Server](#start-the-development-server)
- [Verify the Installation](#verify-the-installation)
- [Docker Alternative](#docker-alternative)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure the following software is installed on your machine before proceeding:

| Software       | Minimum Version | Purpose                          |
| -------------- | --------------- | -------------------------------- |
| Node.js        | 20.0.0+         | JavaScript runtime               |
| npm            | 9.0.0+          | Package manager (ships with Node)|
| PostgreSQL     | 16.0+           | Primary database                 |
| Docker         | 24.0+ (optional)| Containerized development        |
| Docker Compose | 2.20+ (optional)| Multi-container orchestration    |
| Git            | 2.40+           | Version control                  |

To verify installed versions:

```bash
node --version
npm --version
psql --version
docker --version          # optional
docker compose version    # optional
git --version
```

---

## Clone the Repository

```bash
git clone <repository-url> budget-tracker-api
cd budget-tracker-api
```

---

## Install Dependencies

Install all project dependencies using npm:

```bash
npm install
```

This installs both production and development dependencies including Express.js, Prisma ORM, JWT libraries, Zod validation, Winston logging, Jest testing framework, and all other required packages.

---

## Environment Configuration

### 1. Create Your Local Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Open `.env` in your editor and configure each variable:

```dotenv
# ─── Server Configuration ────────────────────────────────────────────
PORT=3000
# The port the Express server listens on.
# Default: 3000

NODE_ENV=development
# Application environment. Controls logging verbosity, error detail,
# and Prisma query logging.
# Options: development | production
# Default: development

# ─── Database Configuration ──────────────────────────────────────────
DATABASE_URL="postgresql://username:password@localhost:5432/budget_tracker?schema=public"
# PostgreSQL connection string.
# Format: postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?schema=<SCHEMA>
#
# Replace:
#   username  → your PostgreSQL username (e.g., postgres)
#   password  → your PostgreSQL password
#   localhost → database host (localhost for local dev)
#   5432      → PostgreSQL port (default: 5432)
#   budget_tracker → database name (create this database first)
#
# Example for local development:
#   DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/budget_tracker?schema=public"

# ─── JWT Authentication ──────────────────────────────────────────────
JWT_SECRET="your-access-token-secret-here"
# Secret key for signing access tokens.
# IMPORTANT: Use a cryptographically secure random string in production.
# Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

JWT_REFRESH_SECRET="your-refresh-token-secret-here"
# Secret key for signing refresh tokens. Must be different from JWT_SECRET.
# Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

JWT_EXPIRES_IN=15m
# Access token expiration time.
# Accepts: 15m, 1h, 1d, etc.
# Default: 15m (recommended for security)

JWT_REFRESH_EXPIRES_IN=7d
# Refresh token expiration time.
# Accepts: 7d, 14d, 30d, etc.
# Default: 7d
```

### 3. Generate Secure JWT Secrets

For development, any string will work. For production, generate cryptographically secure secrets:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET (run again for a different value)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy each output into the corresponding variable in your `.env` file.

---

## Database Setup

### 1. Create the PostgreSQL Database

If you have not already created the database referenced in your `DATABASE_URL`:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE budget_tracker;

# Exit psql
\q
```

### 2. Run Prisma Migrations

Apply the database schema by running all migrations:

```bash
npx prisma migrate dev --name init
```

This command:
- Creates all tables, indexes, and constraints defined in `prisma/schema.prisma`
- Records the migration in the `_prisma_migrations` table
- Generates the Prisma Client

### 3. Generate Prisma Client

If you need to regenerate the Prisma Client without running migrations (e.g., after pulling new schema changes):

```bash
npx prisma generate
```

### 4. Inspect the Database (Optional)

Launch Prisma Studio to visually browse your database:

```bash
npx prisma studio
```

This opens a browser-based GUI at `http://localhost:5555`.

---

## Seed the Database

Populate the database with sample data for development and testing:

```bash
npm run db:seed
```

The seed script creates sample users, income records, expenses, budgets, and other test data so you can immediately explore the API.

---

## Start the Development Server

```bash
npm run dev
```

The server starts with hot-reloading enabled. You should see output similar to:

```
[info] Server running on port 3000
[info] Environment: development
[info] Database connected successfully
```

---

## Verify the Installation

Confirm the server is running by hitting the health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Server is running",
  "data": {
    "status": "healthy",
    "uptime": "0h 0m 5s",
    "environment": "development"
  }
}
```

You can also access the Swagger documentation in your browser:

```
http://localhost:3000/api-docs
```

---

## Docker Alternative

If you prefer to run the entire stack in containers, use Docker Compose:

### 1. Build and Start All Services

```bash
docker-compose up
```

This starts:
- The Node.js application on port 3000
- A PostgreSQL 16 instance on port 5432

### 2. Run in Detached Mode

```bash
docker-compose up -d
```

### 3. View Logs

```bash
docker-compose logs -f app
```

### 4. Stop All Services

```bash
docker-compose down
```

### 5. Stop and Remove Volumes (Full Reset)

```bash
docker-compose down -v
```

This removes the database volume, effectively wiping all data.

---

## Troubleshooting

### Database Connection Refused

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   # macOS (Homebrew)
   brew services list | grep postgresql

   # Linux (systemd)
   sudo systemctl status postgresql
   ```
2. Confirm the database exists:
   ```bash
   psql -U postgres -l | grep budget_tracker
   ```
3. Check your `DATABASE_URL` in `.env` for typos in username, password, host, port, or database name.

### Prisma Migration Fails

**Symptom:** `Error: P1001: Can't reach database server`

**Solutions:**
1. Ensure the database specified in `DATABASE_URL` exists.
2. Verify the PostgreSQL user has sufficient privileges:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE budget_tracker TO your_user;
   ```
3. If migrations are in a broken state, reset (development only):
   ```bash
   npx prisma migrate reset
   ```

### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE :::3000`

**Solutions:**
1. Change the `PORT` variable in `.env` to an available port.
2. Find and kill the process occupying the port:
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

### JWT Errors After Restart

**Symptom:** `JsonWebTokenError: invalid signature`

**Solution:** If you changed `JWT_SECRET` or `JWT_REFRESH_SECRET`, all previously issued tokens become invalid. Users must log in again. This is expected behavior.

### Docker: Container Exits Immediately

**Symptom:** Application container starts and stops.

**Solutions:**
1. Check logs: `docker-compose logs app`
2. Ensure `.env` file exists and is properly configured.
3. Verify the PostgreSQL container is healthy before the app connects. Docker Compose `depends_on` handles startup order but not readiness. The app should include retry logic for database connections.

### Node Version Mismatch

**Symptom:** Syntax errors or unexpected behavior.

**Solution:** This project requires Node.js 20+. Check your version:
```bash
node --version
```
If you need to manage multiple Node versions, use [nvm](https://github.com/nvm-sh/nvm):
```bash
nvm install 20
nvm use 20
```

---

## Next Steps

- Read the [API Reference](./API.md) to explore all available endpoints.
- Review the [Architecture Guide](./ARCHITECTURE.md) to understand the system design.
- Check the [Features Guide](./FEATURES.md) for details on intelligent spending detection.
- See the [Testing Guide](./TESTING.md) to run and write tests.
