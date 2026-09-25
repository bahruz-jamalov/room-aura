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

**Phase 5 (food ordering: cart, checkout, admin order handling) is
complete** — verified against the live project with real orders placed
through the UI, not scripts:

- Guest side: `Home → Food & Drinks → category → item → Cart → place order`
  works end to end, using the same unified `requests` table (`kind: 'order'`)
  and status tracker as Phase 3/4, with an `orders` + `order_items` extension
  for items, total, and payment method (Charge to Room / Pay at Hotel).
  Cart state lives in `CartContext` (in-memory, no persistence by design).
- The `create_order` RPC does the atomic multi-table write (request + order +
  order_items, price/name snapshotted server-side from `menu_items` —
  the client never sends a price) and was hardened through three real bugs
  found while placing live orders, each fixed with its own migration:
  ambiguous `currency` column reference (`00000000000015`), a `RETURNS
  TABLE` type mismatch between `orders.currency` (`char(3)`) and the
  declared `text` column (`00000000000016`), and — the subtlest — the
  function's own `UPDATE orders SET currency = ...` being silently
  filtered to zero rows by RLS because the function ran `SECURITY INVOKER`
  and guests have no UPDATE policy on `orders` by design; fixed by making
  the function `SECURITY DEFINER` (`00000000000018`), which does not widen
  what a guest can do since it still resolves hotel/room/session
  exclusively from the caller's own `guest_hotel_id()`/`guest_room_id()`/
  `guest_session_id()`.
- Re-verified after the fix: a fresh order (RA-1009, Fresh Orange Juice)
  correctly shows `AED 8.00`, not the `USD` placeholder.
- Admin side: Hotel A's admin (department-agnostic `hotel_admin` role) sees
  order-kind requests routed to Food & Beverage in the same Requests queue,
  with an Items/Total/Payment method panel, and drove the same
  New → Accepted → In Progress → On the Way → Completed cycle used for
  service requests — the audit timeline recorded all four transitions
  correctly. Dashboard KPIs gained "Orders Today" and "Revenue Today",
  computed live from `orders`.
- Regression suites re-run after the `SECURITY DEFINER` change and still
  pass: `pnpm test:anon-access` (19/19), `pnpm test:isolation` (40/40).

**Phase 6 (hotel configuration: Services, Menu, Rooms/Floors,
Departments, Staff, QR/Access) is complete** — six admin config screens,
each verified against the live project by actually configuring things
through the UI, not just building forms:

- `/departments`, `/rooms` (floors + rooms + live occupancy),
  `/services` (categories + services), `/menu` (categories + items,
  Available/Sold Out/Hidden) all follow the same pattern: a list, a
  SidePanel add/edit form, and a delete that surfaces the real
  underlying foreign-key behavior instead of a generic error. Rooms
  shows whether a room currently has a live `guest_sessions` row
  ("Occupied"/"Vacant") alongside floor/room CRUD.
- `/services` and `/menu` add a `TranslationEditor` — one locale at a
  time (a select + name/description), flagging any of the hotel's other
  supported locales that don't have a translation yet — instead of
  stacking 9 text areas per field. Verified live: created a "Spa"
  category with EN + AZ translations and a paid service, confirmed it
  appeared correctly in the live guest tourist app end to end, then
  toggled a real menu item (Club Sandwich) to Sold Out and confirmed
  guests saw that immediately too.
- `/staff` (invite, role, department, activate/deactivate) needed a new
  edge function, `invite-staff`, because `staff_users.id` is a foreign
  key straight to `auth.users(id)` — creating a staff member means
  creating an auth user first, which needs the service role and can't
  run from the admin app's own browser session. Verified live: created
  a staff account through the UI, got back a generated temporary
  password, and confirmed it can actually sign in and lands on a
  correctly department-scoped dashboard — not just a database row.
- `/access` (hotel QR, per-room QR, access codes: generate, preview,
  download PNG, deactivate, regenerate) generates and hashes tokens
  entirely client-side (same approach as `scripts/seed.ts`) and renders
  the QR image with the `qrcode` package rather than an external QR API,
  so a live guest-access secret is never sent to a third party just to
  draw a picture of it. Verified live: generated a real Room 1204 QR,
  scanned its `/j/:token` link in a fresh browser tab, and confirmed it
  correctly signed a guest into Room 1204.
- Every nav item and route is gated by `packages/shared/src/permissions.ts`,
  matching the roles matrix exactly: Rooms/Departments/Staff/QR-Access are
  invisible to plain staff (not just disabled), Services/Menu are visible
  read-only, and — found while testing — hiding a nav link doesn't stop
  direct URL navigation, so a new `RequireCapability` route guard
  redirects a plain staff member away from a gated screen even if they
  type the URL directly.
- Two more real bugs found and fixed while building this phase (not
  hypothetical — each was caught by actually testing the CRUD flow
  against the schema): the Departments/Rooms/Services "can't delete,
  still referenced" messages were correct for those tables, but the same
  assumption was wrong for `service_categories → services` and
  `menu_categories → menu_items` (both `ON DELETE CASCADE`, not
  `RESTRICT` — deleting a category silently deletes its contents) and for
  `order_items.menu_item_id` (`ON DELETE SET NULL`, not `RESTRICT` — a
  menu item can always be deleted). Also found and fixed a Phase 2
  regression: `redeem-access`'s `last_used_at` update was fire-and-forget
  and never actually completing, so every access token showed "Last used:
  Never" regardless of real use — folded into the function's existing
  awaited `Promise.all` and re-verified with a real redemption.
- Regression suites re-run after every schema-adjacent change and still
  pass: `pnpm test:anon-access` (19/19), `pnpm test:isolation` (40/40).

**Phase 7 (feedback + analytics) is complete** — verified against the live
project with a real rating submitted through the guest UI, not seeded data:

- Guest side: a completed request's detail screen shows a "Rate your
  experience" button (only while no feedback exists yet) leading to
  `/requests/:id/feedback` — 1–5 stars for satisfaction, 1–5 for effort,
  optional comment, all through the `feedback` table's existing RLS
  ("guest creates feedback for own completed request"). The `feedback`
  i18n namespace was already scaffolded from Phase 1; only three keys
  (`rateExperience`, `submit`, `thankYou`) needed adding, across all 9
  locales.
- Admin side: `/feedback` (ratings/effort/comments, filterable by
  department and minimum rating, with an average-rating/average-effort
  summary) and `/analytics` (operational · guest experience · commercial,
  with Today/7-day/30-day/custom-range presets) — both admin/manager only.
  Dashboard gained real Guest Rating / Effort Score KPIs, replacing the
  Phase 4/5 placeholders that were deliberately left out until real
  feedback data existed.
- Verified live: submitted a real 5-star / 4-effort rating with a comment
  on a completed Housekeeping request through the guest app, and confirmed
  it immediately appeared correctly in the admin Feedback screen, the
  Analytics screen's Guest Experience section, and the Dashboard's Guest
  Rating/Effort Score KPIs (5.0 / 4.0). Confirmed the roles matrix holds:
  Sarah (plain Housekeeping staff) is redirected away from `/analytics`
  and her Dashboard correctly shows "—" for those KPIs, since `feedback`'s
  RLS denies plain staff read access entirely — not just a hidden nav item.
- Three real bugs found and fixed while building this phase: (1) `feedback`
  was never added to the `supabase_realtime` publication (migration
  `00000000000019`) — same lesson as Phase 3/4, now caught proactively
  before shipping rather than after; (2) `/analytics`'s date-range
  computation created a fresh `Date` object every render, which combined
  with a `useEffect` keyed on those objects sent the screen into an
  infinite refetch loop (250+ failed requests) — fixed by memoizing the
  range on the inputs that should actually change it; (3) the analytics
  revenue query filtered `orders.created_at`, a column that doesn't
  exist — `orders` has no timestamp of its own (`id` *is* `request_id`,
  1:1) — so it silently returned zero orders/revenue every time; fixed by
  joining through `requests.created_at` for order-kind rows, the same
  pattern `useDashboardStats` already used correctly.
- Regression suites re-run and still pass: `pnpm test:anon-access`
  (19/19), `pnpm test:isolation` (40/40).

**Phase 8 (Super Admin) is complete** — verified live by creating a real
third hotel through the platform UI, not by seeding fake data:

- `/platform` is a distinct login and layout inside the same admin app
  (decision #4 in section 12) — a separate `PlatformAuthContext` checks
  `platform_admins`, not `staff_users`. Signing in as a hotel admin lands
  on "This account isn't a platform admin" rather than crashing; a real
  platform admin sees a dark-sidebar shell with Hotels/Analytics nav.
- `/platform/hotels`: list · create · activate/deactivate · plan for every
  hotel on the platform. Creating a hotel inserts both the `hotels` row
  and its required `hotel_settings` row.
- `/platform/hotels/:id` and `/platform/analytics`: platform admin
  deliberately has no row-level RLS on `requests`/`orders` across tenants
  (section 4: "not the right to read an individual guest's messages"), so
  these call two new `SECURITY DEFINER` RPCs (migration `00000000000020`)
  instead — `platform_hotel_stats`/`platform_analytics` — each checking
  `is_platform_admin()` itself as its first line, since bypassing RLS
  means the function *is* the security boundary here. Verified directly
  (not just through the UI) that a signed-in hotel admin calling either
  RPC gets `403 forbidden`, not data.
- Verified live: signed in as the seeded platform admin
  (`super@roomaura.demo`), saw both existing hotels, created a third
  ("Coastal Retreat", Lisbon, EUR) through the UI, activated it and
  changed its plan to Pro — all three now visible and manageable,
  satisfying the phase's exit criterion. Confirmed `platform_hotel_stats`
  returns real numbers for Aura Grand Hotel and handles Bosporus Hotel's
  all-zero case (no requests/orders yet) without erroring.
- Found and fixed a real data-quality bug while checking Aura Grand
  Hotel's revenue through the new stats RPC: it showed up split across
  two currencies (AED 8.00 + USD 33.00) even though the hotel only sells
  in AED. Traced it to the two orders placed *before* migration 18
  (Phase 5's `SECURITY DEFINER` fix) landed — that bug was fixed going
  forward, but the two rows it had already corrupted were never
  backfilled. Added migration `00000000000021` to correct every order's
  currency to its own hotel's currency; re-verified both
  `platform_hotel_stats` and the hotel-level `/analytics` screen now show
  a single correct `AED 41.00`.
- Regression suites re-run and still pass: `pnpm test:anon-access`
  (19/19), `pnpm test:isolation` (40/40).

**Phase 9 (hardening) is complete** — tenant isolation suite, role tests,
an RTL pass, and a real (not hypothetical) security fix, all verified
against the live project:

- New automated role-permission suite, `pnpm test:roles`
  (`scripts/test-roles.ts`), signs in as hotel_admin, manager, and a new
  demo manager account (Marcus Chen) alongside the existing staff account
  (Sarah), and checks every cell of `docs/ARCHITECTURE.md` section 7's
  roles × department matrix directly against RLS — not just what the UI
  shows. 24 checks, all passing.
- **Found a systemic RLS bug while writing that suite**: two of its very
  first checks failed — a plain Housekeeping staff account could INSERT a
  new `service_categories` row and a new `departments` row, both of which
  should be admin/manager only. Traced it to every one of the schema's
  14 "admin/manager writes own hotel X" (and "hotel admin manages X")
  policies: each had a `USING` clause that correctly required the right
  role, but a `WITH CHECK` clause that only verified `hotel_id` — never
  the role. This didn't break UPDATE/DELETE (Postgres gates those via
  `USING` against the existing row first, which was always correct) but
  it did break every INSERT path, since INSERT has no existing row and
  `WITH CHECK` is the only gate. Two of the fourteen were more than a
  catalogue-editing nuisance: **any staff member could mint a brand new
  guest-facing QR/access code** (`access_tokens`, meant to be hotel_admin
  only, not even manager), and **any staff member could insert an
  arbitrary new roster row with `role = 'hotel_admin'`** (`staff_users`,
  a privilege-escalation path). Fixed in migration `00000000000022` by
  adding the matching role check to each policy's `WITH CHECK` clause.
  Re-ran the role suite (24/24) plus both existing regression suites
  (19/19, 40/40) after the fix — all green, no legitimate admin/manager
  write broke. Cleaned up two orphaned rows the original (pre-fix) test
  run had left behind, which — fittingly — could only be deleted by an
  admin, since `DELETE` was never affected by the bug.
- **Role-matrix correction**: found while building the test suite's
  expectations that Phase 6 had over-restricted Rooms/Departments —
  section 7 lists them as "read" for plain staff, same as Services/Menu,
  but the nav item and route were hidden/redirected entirely. Fixed
  `AdminLayout` and both screens to match Services/Menu's pattern
  (visible to everyone, edit controls gated on `canManageRoomsAndDepartments`).
- **RTL pass**: switched the guest app to Arabic and verified
  `dir="rtl"`/`lang="ar"` apply at the document level and the layout
  genuinely mirrors (bottom nav order, card grid direction). This
  surfaced two real gaps, both fixed: (1) the demo catalogue only had
  EN/AZ translations, so Arabic (and every other of the 9 launch
  languages) silently fell back to English for category/service/menu-item
  names — backfilled Arabic translations for the seeded catalogue via the
  Phase 6 admin UI's own translation editor, which doubled as another
  live test of that feature; (2) a `"Free"` price label and about a dozen
  other UI strings (an "or" divider, hotel-detail field labels, "Sold
  Out", a couple of error messages, a "Request not found" message, a
  data fallback) were hardcoded English, bypassing i18next entirely —
  added the missing keys across all 9 locale files and fixed every call
  site.
- **Responsive pass**: checked the admin app at a 375px mobile viewport
  and confirmed it is, as designed, not responsive — the roles table
  (section 1) explicitly scopes Hotel Admin/Super Admin as
  desktop/tablet-only, unlike the guest app, which is mobile-first by
  design and already verified at every phase.
- Regression suites, run one final time together after every fix in this
  phase: `pnpm test:anon-access` (19/19), `pnpm test:isolation` (40/40),
  `pnpm test:roles` (24/24) — 83 automated checks, all green.

Automated E2E of the two demo flows was explicitly scoped out for this
pass (no CI pipeline or E2E framework exists yet, and introducing one
felt like more infrastructure than a pilot-stage project needs right
now) — end-to-end coverage instead comes from the live, browser-driven
verification performed throughout every phase of this project.

All 9 phases of the original plan are now complete.
