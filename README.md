# Student Budget & Expense Tracking System

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

A RESTful Node.js API for student budget management with **intelligent overspending detection**, **impulse spending alerts**, **behavioral analytics**, and **financial survival forecasting**.

---

## Feature Highlights

- **Authentication & Profiles** -- JWT-based auth with access/refresh token rotation and user profile management
- **Income & Expense Tracking** -- Full CRUD with categorization, pagination, filtering, and date-range queries
- **Budget Planning** -- Set weekly/monthly spending limits per category with real-time compliance tracking
- **Overspending Detection** -- Automatic alerts when category spending exceeds budget by >10% or weekly spending spikes >40%
- **Impulse Spending Detection** -- Flags rapid purchases (3+ in 60 min), late-night spending (11pm-2am), and post-income impulse buys
- **Behavioral Analytics** -- Spending heatmaps, category dominance charts, monthly trends, and week-over-week comparisons
- **Smart Recommendations** -- Rule-based engine that generates personalized saving tips based on spending patterns
- **Financial Health Forecast** -- Burn-rate calculator, survival-days estimator, and risk meter (Safe/Warning/Danger)
- **Reports & Export** -- Monthly, weekly, and custom date-range reports with CSV export support
- **Smart Notifications** -- Automated weekly digest via cron job with spending summaries and actionable insights
- **Interactive API Docs** -- Auto-generated Swagger UI at `/api/docs`

---

## Quick Start

```bash
# Clone the repository
git clone <repository-url> budget-tracker-api
cd budget-tracker-api

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials and JWT secrets

# Set up database
npx prisma migrate dev --name init
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api/docs`.

### Docker Quick Start

```bash
docker-compose up
```

---

## Tech Stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Runtime        | Node.js 20+                       |
| Framework      | Express.js 4                      |
| Database       | PostgreSQL 16                      |
| ORM            | Prisma 6                          |
| Authentication | JWT (access + refresh tokens)      |
| Validation     | Zod                               |
| Testing        | Jest + Supertest                   |
| Documentation  | Swagger / OpenAPI 3.0              |
| Logging        | Winston + Morgan                   |
| Scheduling     | node-cron                          |
| Containerization | Docker + Docker Compose          |
| Linting        | ESLint + Prettier                  |

---

## API Endpoints Overview

| Module            | Routes | Description                                  |
| ----------------- | ------ | -------------------------------------------- |
| Auth              | 4      | Register, login, refresh, logout             |
| Users             | 4      | Profile CRUD, password change                |
| Income            | 6      | Income CRUD, totals                          |
| Expenses          | 7      | Expense CRUD, category grouping, totals      |
| Budgets           | 6      | Budget CRUD, compliance status               |
| Analytics         | 5      | Heatmaps, trends, summaries, comparisons     |
| Alerts            | 4      | Alert listing, read status management        |
| Recommendations   | 3      | Generate tips, list, dismiss                 |
| Forecast          | 4      | Generate forecast, health report, history    |
| Reports           | 4      | Monthly, weekly, custom reports, CSV export  |
| Notifications     | 6      | Notification CRUD, bulk operations           |

Full API documentation: [docs/API.md](docs/API.md) or visit `/api/docs` when the server is running.

---

## Project Structure

```
budget-tracker-api/
├── prisma/                    # Database schema and seed data
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── app.js                 # Express app setup
│   ├── server.js              # HTTP server entry point
│   ├── config/                # Database, env, Swagger config
│   ├── middleware/            # Auth, validation, error handling, rate limiting
│   ├── modules/               # Feature modules (routes, controllers, services, tests)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── income/
│   │   ├── expenses/
│   │   ├── budgets/
│   │   ├── analytics/
│   │   ├── alerts/
│   │   ├── recommendations/
│   │   ├── forecast/
│   │   ├── reports/
│   │   └── notifications/
│   ├── utils/                 # Logger, response helpers, financial calculators
│   └── constants/             # Category enums, risk level thresholds
├── docs/                      # Project documentation
└── docker-compose.yml
```

---

## Scripts

```bash
npm run dev              # Start dev server with hot reload
npm start                # Start production server
npm test                 # Run test suite
npm run test:coverage    # Run tests with coverage report
npm run lint             # Lint source code
npm run lint:fix         # Auto-fix lint issues
npm run format           # Format code with Prettier
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database with sample data
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Regenerate Prisma Client
```

---

## Documentation

| Document                                     | Description                                           |
| -------------------------------------------- | ----------------------------------------------------- |
| [Setup Guide](docs/SETUP.md)                 | Step-by-step local development setup                  |
| [API Reference](docs/API.md)                 | Complete endpoint documentation with examples         |
| [Database Schema](docs/DATABASE.md)          | Prisma models, relationships, and ERD                 |
| [Architecture](docs/ARCHITECTURE.md)         | System design, module map, and data flow              |
| [Features](docs/FEATURES.md)                 | Deep dive into all 11 intelligent features            |
| [Deployment](docs/DEPLOYMENT.md)             | Production deployment guide                           |
| [Testing](docs/TESTING.md)                   | How to run and write tests                            |
| [Contributing](docs/CONTRIBUTING.md)         | Code style, PR process, branch conventions            |

---

## License

This project is licensed under the [MIT License](LICENSE).
