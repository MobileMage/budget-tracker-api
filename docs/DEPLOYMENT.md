# Deployment Guide

This document covers production deployment options for the Student Budget and Expense Tracking System, including platform-as-a-service providers, VPS deployment, and Docker-based deployment.

---

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Variables for Production](#environment-variables-for-production)
- [Database Migration in Production](#database-migration-in-production)
- [Railway Deployment](#railway-deployment)
- [Render Deployment](#render-deployment)
- [VPS Deployment](#vps-deployment)
- [Docker Production Deployment](#docker-production-deployment)
- [Monitoring and Logging](#monitoring-and-logging)
- [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Checklist

Before deploying to any environment, verify the following:

- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Environment variables are configured for production
- [ ] JWT secrets are cryptographically secure (64+ bytes of randomness)
- [ ] Database connection string points to the production database
- [ ] `NODE_ENV` is set to `production`
- [ ] Prisma migrations have been applied to the production database
- [ ] CORS origins are restricted to your frontend domain(s)
- [ ] Rate limiting is configured appropriately for expected traffic

---

## Environment Variables for Production

All production deployments require the following environment variables:

```dotenv
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@host:5432/budget_tracker?schema=public&sslmode=require"

# Authentication
JWT_SECRET="<64-byte-hex-string>"
JWT_REFRESH_SECRET="<64-byte-hex-string>"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Generate production-grade secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Important notes:
- Always use SSL for database connections in production (`sslmode=require` in the connection string).
- Never commit `.env` files to version control.
- Use the platform's secret management (Railway variables, Render environment, etc.) to store sensitive values.

---

## Database Migration in Production

Apply database migrations to your production database before starting the application:

```bash
npx prisma migrate deploy
```

Key differences from development:
- `migrate deploy` only applies pending migrations. It does not create new migrations or prompt for confirmation.
- If the database does not exist, you must create it manually before running migrations.
- Always take a database backup before running migrations in production.

For automated deployments, include the migration command in your build or start script:

```json
{
  "scripts": {
    "build": "npx prisma generate",
    "start": "npx prisma migrate deploy && node src/server.js"
  }
}
```

---

## Railway Deployment

[Railway](https://railway.app) provides a streamlined deployment experience with built-in PostgreSQL provisioning.

### Step 1: Create a Railway Project

1. Sign in to [Railway](https://railway.app).
2. Click "New Project" and select "Deploy from GitHub Repo."
3. Connect your GitHub account and select the repository.

### Step 2: Add a PostgreSQL Database

1. In your project, click "New" and select "Database" then "PostgreSQL."
2. Railway will provision a PostgreSQL instance and provide a `DATABASE_URL`.
3. This variable is automatically available to your application service.

### Step 3: Configure Environment Variables

In the application service settings, add:

```
NODE_ENV=production
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

The `PORT` and `DATABASE_URL` variables are set automatically by Railway.

### Step 4: Configure the Procfile

Create a `Procfile` in the project root:

```
web: npx prisma migrate deploy && node src/server.js
```

### Step 5: Deploy

Railway deploys automatically on every push to the configured branch. Monitor the build and deploy logs in the Railway dashboard.

### Railway-Specific Notes

- Railway assigns a random port via the `PORT` environment variable. The Express app must listen on `process.env.PORT`.
- Railway provides a public URL in the format `https://<project-name>.up.railway.app`.
- The free tier has usage limits. Check current pricing for production workloads.

---

## Render Deployment

[Render](https://render.com) offers a straightforward deployment path with native PostgreSQL support.

### Step 1: Create a `render.yaml` Blueprint

Create `render.yaml` in the project root:

```yaml
databases:
  - name: budget-tracker-db
    plan: free
    databaseName: budget_tracker
    user: budget_tracker_user

services:
  - type: web
    name: budget-tracker-api
    plan: free
    runtime: node
    buildCommand: npm install && npx prisma generate
    startCommand: npx prisma migrate deploy && node src/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: budget-tracker-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 15m
      - key: JWT_REFRESH_EXPIRES_IN
        value: 7d
```

### Step 2: Deploy via Blueprint

1. Sign in to [Render](https://render.com).
2. Go to "Blueprints" and click "New Blueprint Instance."
3. Connect your GitHub repository.
4. Render reads `render.yaml` and creates the database and web service.

### Step 3: Manual Deployment (Alternative)

If not using the blueprint:

1. Create a PostgreSQL database in the Render dashboard.
2. Create a new "Web Service" and connect your repository.
3. Set the build command: `npm install && npx prisma generate`
4. Set the start command: `npx prisma migrate deploy && node src/server.js`
5. Add environment variables in the service settings.

### Render-Specific Notes

- Render free tier databases expire after 90 days. Use a paid plan for persistent data.
- The service auto-deploys on pushes to the connected branch.
- Render provides a public URL in the format `https://<service-name>.onrender.com`.
- Free tier services spin down after 15 minutes of inactivity and take 30-60 seconds to cold start.

---

## VPS Deployment

For full control over the deployment environment, deploy on a Virtual Private Server (e.g., DigitalOcean, Linode, AWS EC2, Hetzner).

### Prerequisites

- Ubuntu 22.04+ VPS with root or sudo access
- Domain name pointed to the server's IP address
- SSH access configured

### Step 1: Server Setup

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Step 2: Configure PostgreSQL

```bash
# Switch to the postgres user
sudo -u postgres psql

# Create database and user
CREATE USER budget_app WITH PASSWORD 'your_secure_password';
CREATE DATABASE budget_tracker OWNER budget_app;
GRANT ALL PRIVILEGES ON DATABASE budget_tracker TO budget_app;
\q
```

### Step 3: Deploy the Application

```bash
# Create application directory
sudo mkdir -p /var/www/budget-tracker-api
sudo chown $USER:$USER /var/www/budget-tracker-api

# Clone the repository
git clone <repository-url> /var/www/budget-tracker-api
cd /var/www/budget-tracker-api

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
# Edit .env with production values
nano .env

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Step 4: Configure PM2

Create an ecosystem file at `/var/www/budget-tracker-api/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'budget-tracker-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/budget-tracker-error.log',
      out_file: '/var/log/pm2/budget-tracker-out.log',
      merge_logs: true,
      max_memory_restart: '300M',
      restart_delay: 5000,
      max_restarts: 10
    }
  ]
};
```

Start the application:

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save the process list (auto-restart on reboot)
pm2 save

# Configure PM2 to start on boot
pm2 startup systemd
# Run the command it outputs
```

### Step 5: Configure Nginx Reverse Proxy

Create the Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/budget-tracker-api
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/budget-tracker-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot automatically modifies the Nginx config to handle HTTPS
# and sets up auto-renewal via systemd timer

# Verify auto-renewal
sudo certbot renew --dry-run
```

After SSL installation, Nginx automatically redirects HTTP to HTTPS.

### Step 7: Firewall Configuration

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify
sudo ufw status
```

### Updating the Application

```bash
cd /var/www/budget-tracker-api
git pull origin main
npm install --production
npx prisma migrate deploy
npx prisma generate
pm2 reload budget-tracker-api
```

---

## Docker Production Deployment

### Dockerfile

Ensure the project root contains a production-optimized `Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY . .
USER appuser
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
```

### Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://budget_app:${DB_PASSWORD}@db:5432/budget_tracker?schema=public
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_EXPIRES_IN=15m
      - JWT_REFRESH_EXPIRES_IN=7d
    depends_on:
      db:
        condition: service_healthy
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=budget_tracker
      - POSTGRES_USER=budget_app
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U budget_app -d budget_tracker"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

volumes:
  postgres_data:
    driver: local
```

### Deploy with Docker Compose

```bash
# Create a .env file with secrets (do not commit this file)
echo "DB_PASSWORD=$(openssl rand -hex 32)" > .env
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)" >> .env

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Docker Production Best Practices

- Use multi-stage builds to minimize image size.
- Run the application as a non-root user inside the container.
- Use health checks to enable automatic container restart on failure.
- Mount database volumes for data persistence across container restarts.
- Use `.dockerignore` to exclude `node_modules`, `.env`, `.git`, and test files from the build context.
- Pin specific image versions (e.g., `node:20-alpine`, `postgres:16-alpine`) for reproducible builds.

---

## Monitoring and Logging

### Application Logs

In production, Winston writes logs to files:

| File            | Content                              |
| --------------- | ------------------------------------ |
| `error.log`     | Error-level logs only                |
| `combined.log`  | All log levels                       |

When deployed with PM2, application stdout and stderr are captured in PM2 log files. Use `pm2 logs` to view them in real time.

When deployed with Docker, logs are available via `docker compose logs`.

### Health Check Endpoint

Use the health endpoint for monitoring services:

```bash
curl https://your-domain.com/api/health
```

Configure your monitoring tool (UptimeRobot, Pingdom, or AWS CloudWatch) to ping this endpoint at regular intervals.

### PM2 Monitoring

```bash
# Real-time process monitoring
pm2 monit

# Process status
pm2 status

# View logs
pm2 logs budget-tracker-api

# Metrics
pm2 describe budget-tracker-api
```

### Database Monitoring

Monitor PostgreSQL connection pool usage and query performance:

```bash
# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'budget_tracker';"

# Check slow queries (requires pg_stat_statements extension)
sudo -u postgres psql -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### Recommended Monitoring Stack

For comprehensive monitoring in production, consider:

- **Uptime monitoring**: UptimeRobot or Better Uptime (free tiers available)
- **Error tracking**: Sentry (integrates with Express via `@sentry/node`)
- **Metrics**: Prometheus + Grafana for system and application metrics
- **Log aggregation**: If running multiple instances, centralize logs with the ELK stack (Elasticsearch, Logstash, Kibana) or a managed service like Datadog or Logtail

---

## Post-Deployment Verification

After deploying, verify the application is functioning correctly:

```bash
# 1. Health check
curl https://your-domain.com/api/health

# 2. Register a test user
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "monthlyAllowance": 5000
  }'

# 3. Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# 4. Access a protected endpoint using the returned access token
curl https://your-domain.com/api/users/profile \
  -H "Authorization: Bearer <access_token>"

# 5. Verify Swagger docs are accessible
curl -s https://your-domain.com/api-docs | head -20

# 6. Delete the test user (clean up)
curl -X DELETE https://your-domain.com/api/users/account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{ "password": "TestPass123!" }'
```

If all requests return successful responses, the deployment is verified.
