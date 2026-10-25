# Integration hand-off

## Apps

- Backend: repository root (Next.js Route Handlers); `npm run dev`; port `3000`; build `npm run build`; health `GET /api/health`.
- Frontend: repository root; `npm run dev`; build `npm run build`.
- API seam: `lib/client-api.ts` (typed live `fetch` client; UI call sites use this seam). No standalone mock client or dataset files. The development-only preview-state control/sample presentation has been removed from `components/dashboard/income-dashboard.tsx`.

## API inventory

- `GET /api/health`
- `GET /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD&category=...&source=...`
- `POST /api/entries`
- `GET /api/entries/{id}`
- `PATCH /api/entries/{id}`
- `DELETE /api/entries/{id}`
- `GET /api/dashboard?month=YYYY-MM`

Amounts are decimal strings at the API boundary.

## Database

- PostgreSQL local Compose service; Essential.
- Prisma schema: `prisma/schema.prisma`.
- Create migrations in `prisma/migrations/`; connection variable `DATABASE_URL`.
- **Create schema migrations only; NO seed data.**

## Types and services

- Wire types/API client: `lib/client-api.ts`; no separate shared package.
- Services: local PostgreSQL (Essential). No Enhancement services.

## Scaffold environment blocker

- This workspace currently has root-owned, non-writable `node_modules` and `package-lock.json`. Dependency installation and lockfile refresh must be completed in a writable workspace before runtime smoke tests. Do not use sudo.

## Integration attempt results (2026-10-25)

- **Migration created:** `prisma/migrations/20261025000000_create_income_entries/migration.sql` creates only the `income_entries` table, a positive-amount check, and the three schema indexes. No rows, seed files, or fixtures were created. `prisma validate` passed, and Prisma's schema-to-DDL output matched the table columns and indexes.
- **Writable-copy build:** npm dependencies installed in an isolated writable copy that excluded environment files and the locked `node_modules`/lockfile. After correcting TypeScript's unsupported BigInt literal syntax in `lib/validation.ts`, `npm run build` and `npm run lint` both passed there. The original workspace build still cannot resolve `@prisma/client`.
- **Route registration/validation:** the Next.js development host compiled and registered all API routes. Validation probes returned: health `503`; list `400`; create `422`; item GET/PATCH/DELETE `400`; dashboard `400`. The frontend document returned `200`. Valid database-backed reads returned `500` because PostgreSQL was not reachable.
- **Live-data wiring:** dashboard reads and CRUD actions use the typed `lib/client-api.ts` calls. The development preview-state control and its CSS were removed; there is no mock dataset in the UI.
- **Not complete:** migration application failed with Prisma `P1001` (`127.0.0.1:5432` unreachable); health was `503`, and database-backed reads were `500`. `docker compose ps` could not connect to the Docker socket (`/Users/razvan/.docker/run/docker.sock`: no such file). The root workspace's `node_modules` is uid 0/mode 755 and `package-lock.json` is uid 0/mode 644; npm install also failed with `EACCES` while renaming an existing entry in `~/.npm/_cacache`. No sudo was used and the root lockfile was not modified.
- **Remaining, once the project workspace is writable and Docker is running:** ensure the local `.env` has the Compose-required settings without disclosing its values; run `docker compose up -d db`, then `npm install`, `npm run prisma:generate`, and `npm run migrate`. Start the app with `npm run dev`; verify `GET /api/health` returns `200`, repeat read/write API checks against the empty schema, and use the dashboard to confirm successful live requests. Only then mark this plan `Integrated`.
