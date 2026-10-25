# Project Plan

**Status**: Planning
**Created**: 2026-10-25
**Mode**: AUGMENT

---

## 1. Project Overview

**Goal**: Extend the existing Next.js starter into a responsive, single-user income tracker for recording GBP income and reviewing monthly totals, category breakdowns, and income trends. The project is designed so that every module is independently testable.

**App Type**: SPA + API

**API Login**: No

**Mode**: AUGMENT

**Deployment Plan**: No deployment plan found

---

## 2. Backend — Next.js Route Handlers

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Runtime** | Node |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |
| **Orchestration** | docker-compose |

The existing Next.js application provides server-side rendering and same-origin App Router Route Handlers. Prisma accesses local PostgreSQL from server-only modules. Store GBP amounts as exact fixed-precision decimal values with two fractional digits; never use binary floating-point for money. Serialize amounts consistently as decimal strings at API boundaries. Each income record has amount, received date, source, category, and optional notes. The dashboard derives monthly totals, category breakdowns, and time-series trends from persisted records. No sign-in or account-management feature is in scope.

---

## 3. Frontend — Web App

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Framework** | Next.js 16.4.3 / React 19.3.0 (existing App Router starter) |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |

The responsive dashboard will use live backend data, with no mock data in the shipped UI. It will provide income entry and editing, confirmed deletion, monthly totals, category breakdowns, an income trend, and a record list with received-date, category, and source filters. GBP is the sole currency, as explicitly approved by the user. Empty, loading, and recoverable error states should be clear and accessible.

---

## 4. Services Required

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|------------|---------------------|----------------------|----------------|
| PostgreSQL (local Docker Compose; no Azure resource selected) | Persistent income records and dashboard summary source data | `DATABASE_URL` | `postgresql://<local-user>:<local-password>@localhost:5432/income_tracker` | Essential |

No Azure-hosted service is required by the approved local-development scope. Keep database credentials and other secrets in ignored local environment files; never commit them.

---

## 5. Prerequisites

### Run

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Node.js | * | ✅ | v24.21.0 |
| npm | * | ✅ | v12.2.1 |
| Docker Engine | Backend | ✅ | v29.9.2 |
| Docker Compose | Backend | ✅ | v5.6.1 |

### Debug

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Docker Engine | Backend | ✅ | v29.9.2 |
| Docker Compose | Backend | ✅ | v5.6.1 |
| Google Chrome | Frontend | ✅ | 156.0.8078.47 |

---

## 6. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: A calm, editorial finance dashboard with a warm off-white canvas, deep evergreen actions, restrained mint highlights, and crisp card surfaces. Prioritize legible totals and quick scanning, with responsive layouts that keep the entry workflow and recent activity easy to reach on smaller screens.
**Typography**: Inter, system-ui

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#176B55` | Evergreen primary actions, selected navigation, and chart emphasis |
| `accent` | `#A7DCC8` | Mint highlights for positive income and category accents |
| `surface` | `#F6F7F3` | Warm neutral dashboard background |
| `text` | `#1D2924` | Main income figures, headings, and record details |
| `muted` | `#6C7972` | Supporting labels, filter hints, and date metadata |
| `border` | `#DDE4DE` | Subtle separators, form outlines, and card boundaries |

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Income Dashboard | `/` | Review this month's total, category breakdown, monthly trend, and recent records; manage income entries in add/edit dialogs | `header, nav, hero, grid, card-list, table, actions` |

### Sample Content

Income Dashboard — income records:
| Received | Source | Category | Amount (GBP) |
|----------|--------|----------|--------------|
| 2026-10-24 | Northstar Studio | Freelance | £1,250.00 |
| 2026-10-21 | Acorn Design Co. | Consulting | £680.50 |
| 2026-10-18 | Riverside Market | Sales | £215.75 |
| 2026-10-15 | Cedar Learning | Teaching | £420.00 |
| 2026-10-08 | Northstar Studio | Freelance | £975.00 |

Dashboard summary — October 2026: total £3,541.25 · categories: Freelance £2,225.00, Consulting £680.50, Teaching £420.00, Sales £215.75 · monthly trend: August £2,940.00, September £3,180.50, October £3,541.25.

Add/Edit Income — Amount: £125.00 · Received date: 2026-10-25 · Source: Northstar Studio · Category: Freelance · Notes: October project milestone.

---

## 7. Project Structure

```text
expenses-app/
├── .azure/
│   └── project-plan.md
├── app/
│   ├── api/
│   │   ├── dashboard/route.ts
│   │   ├── entries/route.ts
│   │   ├── entries/[id]/route.ts
│   │   └── health/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── dashboard/
│       └── income-dashboard.tsx
├── lib/
│   ├── client-api.ts
│   ├── http.ts
│   ├── prisma.ts
│   └── validation.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml
├── package.json
└── .env.example
```

---

## 8. Route Definitions

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|-------------|--------------|-------------|
| 1 | GET | `/api/health` | Check application and database readiness | — | `{ status, services }` | 200, 503 |
| 2 | GET | `/api/entries` | List records with optional received-date, category, and source filters | Query: `from`, `to`, `category`, `source` | `{ entries: [{ id, amount, receivedDate, source, category, notes }] }` | 200, 400, 500 |
| 3 | POST | `/api/entries` | Create an income record | `{ amount, receivedDate, source, category, notes? }` | `{ entry }` | 201, 400, 422, 500 |
| 4 | GET | `/api/entries/{id}` | Retrieve one income record | — | `{ entry }` | 200, 404, 500 |
| 5 | PATCH | `/api/entries/{id}` | Update an income record | Partial `{ amount, receivedDate, source, category, notes? }` | `{ entry }` | 200, 400, 404, 422, 500 |
| 6 | DELETE | `/api/entries/{id}` | Delete an income record | — | `{ deleted: true }` | 200, 404, 500 |
| 7 | GET | `/api/dashboard` | Return live monthly totals, category breakdown, and trend | Query: optional `month` | `{ month, total, categories, trend }` | 200, 400, 500 |

---

## 9. Next Steps

1. Review and approve this plan in the plan preview before scaffolding
2. After approval, run **azure-project-scaffold** to execute the plan
3. Run **azure-project-integrate** to create Prisma migrations, smoke-test backend endpoints, and wire the frontend to live PostgreSQL data
4. Run **azure-debug-plan** → **azure-debug-generate** for local Docker and VS Code debugging
5. Run the **azure-deploy** agent if a cloud deployment is desired later
