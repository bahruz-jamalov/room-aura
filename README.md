# ROOM-AURA

A multilingual, multi-tenant hotel-service platform: a mobile-first app lets
hotel guests discover and request services in their own language; a web
admin panel lets hotel staff receive, translate, route and fulfil those
requests. One Supabase backend, two frontends.

Full product and technical context — system architecture, database schema,
RLS/security model, information architecture, roles, state machines, MVP
scope and the phase plan — lives in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
Read that before touching the schema or the permission model.

## Repository layout

```
apps/
  tourist/     Guest-facing PWA (mobile-first)
  admin/       Hotel staff & management web app (desktop-first)
packages/
  shared/      Domain types, request/order state machine, permission
               matrix, translation provider interface, money helpers
  i18n/        UI strings for all 9 launch languages + RTL handling
  ui/          Design tokens (two skins: tourist warm/premium, admin
               dense/professional), shared by both apps
supabase/
  migrations/  Numbered SQL migrations — the schema's source of truth
  functions/   Edge functions (added from Phase 2 onward)
scripts/
  seed.ts             Demo/test data seeder (service role key required)
  test-isolation.ts   Automated tenant-isolation proof (anon key only)
docs/
  ARCHITECTURE.md       Full architecture proposal (approved)
  DEMO_CREDENTIALS.md   Seed account emails/password for demos
```

## Prerequisites

- Node.js 20+ (`node -v`)
- pnpm, via corepack: `corepack enable && corepack prepare pnpm@latest --activate`
- A Supabase project (hosted; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §12 for why hosted over local Docker)

## Setup

```bash
pnpm install
```

Link this repo to your Supabase project (interactive — asks you to sign in
and enter the database password; never share either with anyone, including
an AI assistant):

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <your-project-ref>
```

Push the schema:

```bash
pnpm db:push
```

In the dashboard, **Authentication → Sign In / Providers**, turn on **Allow
anonymous sign-ins** — guest sessions (docs/ARCHITECTURE.md §4) depend on it.

Deploy the edge functions. This needs a **personal access token** (from
[supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens),
distinct from the service role key) — export it in your own shell, never
paste it into chat with an AI assistant, never commit it:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
pnpm exec supabase functions deploy redeem-access
pnpm exec supabase functions deploy translate-content
```

Copy env files and fill in your project's URL + publishable (anon) key —
both are safe to embed in a frontend bundle, since Row Level Security, not
key secrecy, is what protects the data:

```bash
cp .env.example apps/tourist/.env.local   # then edit
cp .env.example apps/admin/.env.local     # then edit
```

Seed demo/test data. This needs the **service role key** (Project Settings →
API Keys → `service_role`) — export it in your own shell, never paste it
into chat with an AI assistant, never commit it:

```bash
export SUPABASE_URL=https://xxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
pnpm seed
```

See [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md) for the accounts this
creates. It also generates a Room 508 QR token and a hotel-wide access code
for testing onboarding — see scripts/.demo-ids.json (gitignored) after running it.

## Running

```bash
pnpm dev:tourist   # http://localhost:5173
pnpm dev:admin     # http://localhost:5174
```

## Verifying tenant isolation

The single most important correctness property in a multi-tenant system.
After seeding, run:

```bash
export SUPABASE_URL=https://xxxx.supabase.co
export SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
pnpm test:isolation
```

This signs in as real staff JWTs for two different hotels and asserts,
through the actual PostgREST + RLS path, that neither can read or write the
other's data across every tenant table.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev:tourist` / `pnpm dev:admin` | Run one app's Vite dev server |
| `pnpm build` | Build both apps |
| `pnpm typecheck` | Typecheck every workspace package |
| `pnpm db:push` | Push local migrations to the linked Supabase project |
| `pnpm db:diff` | Diff the linked project's schema against migrations |
| `pnpm seed` | Create demo hotels, departments, rooms, staff (needs service role key) |
| `pnpm test:isolation` | Automated tenant-isolation test (needs seed data) |
| `pnpm test:anon-access` | Default-deny check with no session at all (needs no seed data) |

## Security notes

- Never commit a real `.env`/`.env.local`, the Supabase `service_role` key,
  the database password, or a Supabase personal access token. `.gitignore`
  already excludes the standard filenames — don't work around it.
- The `anon`/publishable key and project URL are the only Supabase values
  meant to ship in a frontend bundle.
- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §4 for the full RLS/security model.

## Project status

**Phase 1 (foundation) is complete** — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §11 for the full phase plan.
Verified against the live hosted Supabase project, not just asserted:

- Schema + RLS pushed; `pnpm test:anon-access` passes 19/19 with zero seed
  data (only the language catalogue is publicly readable).
- Demo data seeded (Aura Grand Hotel + Bosporus Hotel — see
  [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md)).
- `pnpm test:isolation` passes 40/40 with real staff JWTs: Hotel A and
  Hotel B cannot read or write each other's data, across every tenant
  table, in either direction — the Phase 1 exit criterion.
- Real staff login verified in the browser: signing in as Hotel A's admin
  resolves their hotel/role/department entirely through RLS, with no
  hotel ID chosen by the client.
- Both apps build and typecheck; design tokens verified visually, including
  a live RTL flip for Arabic.

**Phase 2 (guest onboarding, home, service discovery) is complete** — also
verified against the live project, not just built:

- `supabase/functions/redeem-access` deployed and confirmed working end to
  end: navigating to a Room 508 QR's `/j/:token` URL signs the guest in
  anonymously, redeems the token, creates a `guest_sessions` row, and lands
  on a localised Home screen — the Phase 2 exit criterion.
- The "Enter Access Code" fallback (code + room number) exercises the same
  function's other branch.
- Full 5-tab navigation shell in place; language switching verified live
  mid-session (English → Azerbaijani), including nav labels and content.
- Service category/service discovery screens read hotel-controlled catalogue
  data through RLS with locale fallback (requested → hotel default → en).

**Phase 3 (requests, free-text + translation, tracking, realtime) is
complete** — including the spec's own headline end-to-end test, run for
real against the live project:

- An Azerbaijani free-text request ("Otağıma iki əlavə dəsmal gətirə
  bilərsiniz?") is mock-translated, correctly routed to Housekeeping by
  keyword (`routing_rules`), and created as a trackable request — verified
  via `supabase/functions/translate-content` and
  `apps/tourist/src/lib/departmentRouter.ts`.
- Structured requests (e.g. Extra Towels, with quantity) work the same way
  through `ServiceDetailScreen`.
- The full guest journey — Request Received → Accepted → On the Way →
  Completed — was driven by real staff accounts (Hotel A's admin and a
  department-scoped Housekeeping staff member) updating `requests.status`,
  and the guest's tracker screen updated live via Realtime with **no page
  reload** at every step, matching the spec's most important end-to-end
  test. The audit trail (`request_status_history`) and in-app
  `notifications` were both populated automatically by the database
  trigger, not the client.
- Found and fixed in the process: guests had no RLS read access to
  `routing_rules`, so free-text requests always fell back to the hotel's
  default department regardless of keyword (migration
  `00000000000012_guest_routing_rules_read.sql`).
- "My Requests" (Active/Completed tabs) also updates live via Realtime.

**Phase 4 (admin dashboard, live request queue, assignment, status
management) is complete** — driven by real staff clicks, not scripts:

- Login → Dashboard (KPI cards for what's actually real: New, In Progress,
  Completed Today, Avg Response Time — Orders/Revenue/Rating/CES are left
  out rather than faked, since they need Phase 5/7 data that doesn't exist
  yet) → Requests queue, live via Realtime, with Status/Department/Room
  filters.
- The request detail panel's actions are generated from
  `ALLOWED_TRANSITIONS` (the same table the database trigger enforces), so
  it can never offer a transition the backend would reject. Verified live:
  a full New → Accepted → In Progress → On the Way → Completed cycle driven
  entirely by clicking through the real UI as Hotel A's admin.
- Assign employee, set estimated time, and add an internal note all work,
  each producing a `request_status_history` row; the audit timeline
  (matching the spec's "14:32 Request received / 14:34 Accepted by
  Sarah..." example) updates live via Realtime once mounted after the
  publication includes it.
- Role scoping verified by actually signing in as a department-scoped
  Housekeeping staff account: she sees only her department's requests, no
  department filter, and the sidebar/permissions match
  `packages/shared/src/permissions.ts`.
- Two bugs found and fixed while testing: the detail panel's fixed overlay
  covered the top bar's Sign out button (z-index), and
  `request_status_history` wasn't in the Realtime publication (migration
  `00000000000013_history_realtime.sql`), so the audit timeline only
  showed what existed at mount time.

Phases 5–9 (ordering, hotel configuration, feedback/analytics, super admin,
hardening) have not started.
