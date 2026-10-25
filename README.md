# Income Tracker

A single-user local income tracker for GBP. Record income, filter entries, and
review monthly totals, category breakdowns, and a six-month trend.

## Local setup

1. Install the dependencies with `npm install`.
2. Copy `.env.example` to `.env` and replace its placeholders with private local
   values. Keep `.env` out of source control; never paste secrets into code or
   chat.
3. Start the local database with `docker compose up -d db`.
4. Generate the Prisma client with `npm run prisma:generate`.
5. Apply the Prisma migration created during the integration step with
   `npx prisma migrate dev`.
6. Start the app with `npm run dev` and open <http://localhost:3000>.

No migration or seed data is included in the scaffold. The integration step
creates the PostgreSQL migration and verifies the API against the local
database.

## API

- `GET /api/health` — application and database readiness.
- `GET /api/entries` — list entries; optional `from`, `to`, `category`, and
  `source` filters.
- `POST /api/entries` — create an entry.
- `GET /api/entries/{id}` — retrieve an entry.
- `PATCH /api/entries/{id}` — update an entry.
- `DELETE /api/entries/{id}` — delete an entry.
- `GET /api/dashboard?month=YYYY-MM` — monthly total, category totals, and the
  six-month trend.

Amounts are stored as PostgreSQL `DECIMAL(12,2)` and passed through the API as
decimal strings to avoid binary floating-point rounding.

## Quality checks

- `npm run lint`
- `npm run build`
