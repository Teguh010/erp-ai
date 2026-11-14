# AI-Powered ERP

Monorepo ERP for manufacturing (e.g. snack food plants) with **Inventory**, **Production**, **Supply Chain**, **Sales**, and **AI Assistant** modules.

| Layer | Stack | Folder |
|-------|--------|--------|
| Backend API | NestJS, Prisma, MySQL | [`apps/api`](./apps/api) |
| Frontend | Next.js | [`apps/web`](./apps/web) |
| Database & cache (local) | MySQL 8, Redis | [`docker-compose.yml`](./docker-compose.yml) |

Deeper architecture notes: [`TECHNICAL_DOCUMENTATION.md`](./TECHNICAL_DOCUMENTATION.md).

**Employee onboarding (ID):** [Full guide](./docs/NEW_EMPLOYEE_GUIDE.md) · [1-page cheat sheet](./docs/ONBOARDING_CHEATSHEET.md) · [Export to PDF for Trello](./docs/HOW_TO_EXPORT_PDF.md)

---

## Prerequisites

- **Git**
- **Node.js 20+** (LTS recommended)
- **npm**
- **Docker Desktop** (or Docker Engine + Docker Compose) for MySQL

```bash
node -v
npm -v
docker compose version
```

---

## Run locally

### 1. Clone & start infrastructure

```bash
git clone <repository-url> erp
cd erp
docker compose up -d
```

Docker starts:

| Service | Host | Default credentials |
|---------|------|---------------------|
| MySQL | `localhost:3306` | DB: `erp_db`, user: `root`, password: `rootpassword` |
| Redis | `localhost:6379` | No password (optional, used for cache) |

Check status:

```bash
docker compose ps
```

### 2. Backend API (`apps/api`)

```bash
cd apps/api
npm install
```

Create `.env` (copy from [`.env.example`](./apps/api/.env.example)):

```bash
cp .env.example .env
```

Set at least `DATABASE_URL` and `JWT_SECRET` as needed.

Sync the database and seed sample data:

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

Run the API in development mode:

```bash
npm run start:dev
```

If successful:

- API: [http://localhost:3000/api](http://localhost:3000/api)
- Swagger: [http://localhost:3000/docs](http://localhost:3000/docs)

Keep this terminal running.

### 3. Frontend (`apps/web`)

Open a new terminal:

```bash
cd apps/web
npm install
```

Create `.env.local` (copy from [`.env.example`](./apps/web/.env.example)):

```bash
cp .env.example .env.local
```

**Ports:** The API defaults to **3000**. Next.js also defaults to **3000**, so run the web app on **3001**:

```bash
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001) and sign in.

Ensure `apps/api/.env` includes:

```env
CORS_ORIGIN=http://localhost:3001
```

---

## Test accounts (after `prisma db seed`)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@erp.com` | `password123` |
| Warehouse | `warehouse@erp.com` | `password123` |
| Production | `production@erp.com` | `password123` |

---

## Daily dev workflow

```bash
# Terminal 1 — from repo root
docker compose up -d

# Terminal 2 — API
cd apps/api && npm run start:dev

# Terminal 3 — Web
cd apps/web && npm run dev -- -p 3001
```

---

## Optional features

| Feature | Environment | Notes |
|---------|-------------|--------|
| Redis cache | `REDIS_HOST=localhost` in `apps/api/.env` | If Redis is missing or unreachable → in-memory cache |
| AI Assistant | `GROQ_API_KEY` in `apps/api/.env` | Without a key, chat shows a configuration message |
| Notifications (BullMQ) | Module disabled in API | Not required for local dev |

---

## Troubleshooting

**Port 3306 already in use**  
Another MySQL instance is using the port. Stop it or change the mapping in `docker-compose.yml` (e.g. `3307:3306`) and update `DATABASE_URL`.

**`DATABASE_URL is not set`**  
`.env` must live in `apps/api/`, not only at the repo root.

**CORS / frontend cannot sign in**  
- API runs on port `3000`
- `CORS_ORIGIN=http://localhost:3001` in `apps/api/.env`
- `NEXT_PUBLIC_API_URL=http://localhost:3000/api` in `apps/web/.env.local`
- Restart the API after changing `.env`

**Web and API both on port 3000**  
Run the web app with `npm run dev -- -p 3001`.

**Reset local database (wipe all data)**

```bash
docker compose down -v
docker compose up -d
cd apps/api
npx prisma db push
npx prisma db seed
```

---

## Useful commands

```bash
# API (from apps/api)
npm run test
npm run test:e2e
npm run build
npm run start:prod

# Web (from apps/web)
npm run build
npm run start
```

---

## Roadmap & TODO

High-level status for planning (e.g. Trello). Move items to **In progress** when work starts.

### Done

- Monorepo: NestJS API + Next.js dashboard
- MySQL/Prisma, Docker Compose (MySQL + Redis), seed data
- Auth (JWT) + role guards on API (`ADMIN`, `WAREHOUSE_MANAGER`, `PROCUREMENT`, etc.)
- **Inventory:** warehouses, products, stock levels, movements, dashboard stats
- **Production:** BOM, production orders (material use / finished goods), packaging reports
- **Supply chain:** suppliers, purchase orders, receiving → inbound stock
- **Sales:** customers, orders, shipping → outbound stock
- **AI:** chat & analysis (Groq); optional `GROQ_API_KEY`
- API: global exception filter, validation, Swagger, rate limiting, Redis cache fallback
- Local setup docs (this README + `.env.example`)

### In progress

_None — add the card you are actively working on._

Suggested next picks:

- Frontend error handling (boundaries, query `isError`, mutation feedback)
- Inventory RBAC & low-stock alerts

### Pending (near-term)

| Priority | Task |
|----------|------|
| P0 | Frontend resilience: `error.tsx`, normalize API error messages, toasts for failed mutations |
| P0 | Query error states on main pages (dashboard, inventory, PO, sales) — avoid silent empty UI |
| P1 | Low stock / reorder level (API + UI; `getLowStockItems` is currently a no-op) |
| P1 | Frontend RBAC: hide menus and actions by role |
| P1 | Warehouse staff role (narrower permissions than `WAREHOUSE_MANAGER`) |
| P2 | Inter-warehouse stock transfer |
| P2 | Stock opname workflow (adjustment + optional approval) |
| P2 | Use `reservedQty` for sales/production reservations |
| P3 | Enable `NotificationsModule` when Redis is available |
| P3 | Align UI fields with API/schema (e.g. warehouse `code`) |
| P3 | Prisma baseline migrations for production (not only `db push`) |

### Backlog

- Batch/lot traceability, SKU/barcode, vendor portal, logistics tracking
- Reports/exports (PDF/Excel), demand forecasting
- Optional supply-chain audit trail (e.g. hashed events) if compliance requires it
- E2E tests (Playwright/Cypress), fuller CI for `apps/web`
- i18n (UI is mixed EN/ID today)

### Viewing data

```bash
cd apps/api
npx prisma studio
```

---

## Project structure

```
erp/
├── docker-compose.yml
├── apps/
│   ├── api/          # NestJS + Prisma
│   │   └── prisma/   # schema, migrations, seed
│   └── web/          # Next.js dashboard
└── TECHNICAL_DOCUMENTATION.md
```
