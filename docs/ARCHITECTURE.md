# ROOM-AURA — MVP Architecture (v0.1, for Product Owner approval)

Status: **PROPOSAL — not yet approved, no code written.**
Date: 2026-09-25

---

## 1. Understanding of ROOM-AURA

ROOM-AURA is a **multi-tenant SaaS** that removes the language barrier and the
reception phone call between a hotel guest and the hotel's own services.

Three surfaces, one backend:

| Surface | Users | Form factor | Auth |
|---|---|---|---|
| Tourist App | Hotel guests | Mobile-first web app | No account. QR / access code → guest session |
| Hotel Admin Panel | Hotel staff & management | Desktop/tablet web | Email + password, role-based |
| Super Admin | ROOM-AURA company | Desktop web | Email + password, platform-level |

The MVP exists to answer five business questions: will guests use it instead of
calling; does their own language make them more comfortable asking; does
discovery increase usage; can hotels operate it efficiently; does it grow
ancillary revenue. Every feature below is justified by one of those, or it is
out of scope.

**The product is the loop, not the screens.** The MVP is done when this runs
end to end: guest asks (in their language) → backend records and routes →
hotel staff sees it (translated) → staff acts → guest sees the status change
live → guest rates it → the hotel sees it in analytics.

Two non-negotiable properties: **tenant isolation** (Hotel A can never read
Hotel B) and **language is data, not code** (no `name_en` columns, no
hard-coded category lists).

---

## 2. System architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│   Tourist App (PWA)     │        │  Hotel Admin Panel       │
│   React + TS + Vite     │        │  React + TS + Vite       │
│   mobile-first, i18n,   │        │  desktop-first, dense    │
│   RTL-capable           │        │  + /platform (Super Admin)│
└───────────┬─────────────┘        └────────────┬─────────────┘
            │  supabase-js (anon key)           │ supabase-js (anon key)
            │  JWT = anonymous auth user        │ JWT = staff auth user
            └──────────────┬────────────────────┘
                           ▼
               ┌───────────────────────────┐
               │      SUPABASE             │
               │  Postgres + RLS  (truth)  │
               │  Auth (staff + anon guest)│
               │  Realtime (status push)   │
               │  Storage (images, QR PNG) │
               │  Edge Functions:          │
               │   • redeem-access         │
               │   • create-freetext-req   │
               │   • translate-content*    │
               └───────────┬───────────────┘
                           │  server-side only, keys never in browser
                           ▼
               ┌───────────────────────────┐
               │  TranslationProvider      │
               │  mock → (later) Claude API│
               └───────────────────────────┘
```

`*` = post-Phase-3, optional.

### Why this shape

- **Postgres + RLS is the security boundary**, not the frontend. Both apps use
  the public anon key and get exactly the rows their JWT entitles them to. A
  bug in the admin UI cannot leak Hotel B's data.
- **Edge Functions only where a secret or privileged write is required**:
  redeeming an access token, and calling a translation API. Everything else is
  a direct, RLS-protected query. Fewer moving parts, faster to build.
- **Realtime via Postgres Changes** on `requests` / `notifications`. The guest's
  tracker and the staff queue are both just subscriptions. No polling, no
  websocket server to operate.
- **Translation is an interface, not a call site.** One module, two
  implementations (mock now, real later), swapped by an env var.

### Repository layout (pnpm monorepo)

```
room-aura/
├─ apps/
│  ├─ tourist/            # guest PWA
│  └─ admin/              # hotel panel + /platform super admin
├─ packages/
│  ├─ shared/             # domain types, state machine, permissions,
│  │                      # zod schemas, money utils, generated DB types
│  ├─ i18n/               # UI string catalogues (9 locales) + RTL helpers
│  └─ ui/                 # design tokens + primitives shared by both apps
└─ supabase/
   ├─ migrations/         # numbered SQL, source of truth for schema + RLS
   ├─ functions/          # edge functions (Deno)
   └─ seed.sql            # demo data (Aura Grand Hotel, Dubai)
```

One monorepo, two deployables. The shared package is what stops the two apps
from drifting: the status enum, the transition rules and the permission matrix
exist **once**.

### Stack choices

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 19 + TypeScript (strict) | Fastest iteration, no SSR needed |
| Styling | Tailwind v4, CSS-variable tokens, two themes | One token layer, two very different skins |
| Admin components | shadcn-style primitives (owned code, not a dep) | Tables/drawers/forms without fighting a library |
| Server state | TanStack Query + Supabase realtime invalidation | Cache + live updates without Redux |
| Forms | react-hook-form + zod (schemas in `shared`) | Same validation client and edge function |
| Routing | React Router | Plain, well understood |
| UI i18n | i18next + react-i18next, JSON per locale | Namespaced, lazy-loaded, pluralisation, RTL |
| Content i18n | Translation tables in Postgres | Hotel-controlled, scales to new languages |
| Money | integer minor units + ISO-4217 code | Never floats for money |
| Deploy | Static hosts (Vercel/Netlify/Cloudflare) + Supabase cloud | Two build commands, no servers |

---

## 3. Database schema

Conventions: `uuid` PKs (`gen_random_uuid()`), `timestamptz` everywhere,
`hotel_id` on **every** tenant row (denormalised deliberately — it makes every
RLS policy a single indexed predicate), `created_at`/`updated_at` on mutable
tables, soft state via `is_active` rather than deletes.

### Enums

```sql
hotel_status     : active | inactive | trial
hotel_plan       : pilot | pro | enterprise
staff_role       : hotel_admin | manager | staff
staff_status     : active | inactive
category_type    : standard | menu
request_kind     : service | freetext | order
request_status   : new | accepted | in_progress | on_the_way | completed | cancelled
actor_type       : guest | staff | system
event_type       : status_change | note | assignment | estimate
payment_method   : charge_to_room | pay_at_hotel
menu_item_status : available | sold_out | hidden
access_kind      : hotel | room | access_code
audience         : guest | staff
```

### Platform level

| Table | Key columns |
|---|---|
| `platform_admins` | `user_id` PK → `auth.users`, `full_name` |
| `languages` | `code` PK (`en`,`az`,`tr`,`ru`,`ar`,`zh`,`fr`,`de`,`es`), `name_native`, `name_en`, `is_rtl`, `is_active` |

`languages` is the only globally readable table. Adding a tenth language is one
row plus one JSON catalogue — no schema change, no code change.

### Tenant core

| Table | Key columns |
|---|---|
| `hotels` | `id`, `slug` uq, `name`, `city`, `country`, `timezone`, `default_locale` (staff operating language), `supported_locales text[]`, `currency char(3)`, `logo_url`, `status`, `plan`, `created_at` |
| `hotel_settings` | `hotel_id` PK, `about`, `address`, `contact_phone`, `checkin_time`, `checkout_time`, `amenities jsonb`, `guest_session_ttl_hours` (default 72), `freetext_department_id`, `brand_primary`, `brand_accent` |
| `departments` | `id`, `hotel_id`, `code`, `name`, `is_active`, `sort_order`, uq(`hotel_id`,`code`) |
| `floors` | `id`, `hotel_id`, `number`, `label`, `sort_order` |
| `rooms` | `id`, `hotel_id`, `floor_id`, `number`, `is_active`, uq(`hotel_id`,`number`) |
| `staff_users` | `id` PK = `auth.users.id`, `hotel_id`, `department_id` (null for admin/manager), `role`, `full_name`, `email`, `status` |

### Catalogue (hotel-controlled guest content)

| Table | Key columns |
|---|---|
| `service_categories` | `id`, `hotel_id`, `category_type`, `icon`, `image_url`, `sort_order`, `is_active` |
| `service_category_translations` | PK(`category_id`,`locale`), `name`, `description` |
| `services` | `id`, `hotel_id`, `category_id`, `department_id`, `image_url`, `is_free`, `price_minor`, `currency`, `expected_minutes`, `opening_hours jsonb`, `allows_quantity`, `max_quantity`, `allows_note`, `is_active`, `sort_order` |
| `service_translations` | PK(`service_id`,`locale`), `name`, `description` |
| `menu_categories` | `id`, `hotel_id`, `sort_order`, `is_active` |
| `menu_category_translations` | PK(`menu_category_id`,`locale`), `name` |
| `menu_items` | `id`, `hotel_id`, `menu_category_id`, `image_url`, `price_minor`, `currency`, `prep_minutes`, `allergens text[]`, `status`, `sort_order` |
| `menu_item_translations` | PK(`menu_item_id`,`locale`), `name`, `description` |

**No `name_en` / `name_ru` columns anywhere.** Resolution order at read time:
requested locale → hotel `default_locale` → `en`. Allergens are a fixed code
vocabulary (`gluten`, `dairy`, `nuts`, …) translated by the UI catalogue, so
they cost no tables.

### Access & sessions

| Table | Key columns |
|---|---|
| `access_tokens` | `id`, `hotel_id`, `room_id` (null for hotel-wide), `kind`, `token_hash`, `label`, `is_active`, `expires_at`, `created_by`, `last_used_at` |
| `guest_sessions` | `id`, `hotel_id`, `room_id`, `auth_user_id` uq → `auth.users`, `locale`, `source`, `created_at`, `expires_at`, `last_seen_at`, `revoked_at` |

Only the **hash** of a token is stored. A database dump does not yield working
QR codes. QR encodes `https://app.roomaura.com/j/<opaque-token>` — no internal
IDs are ever exposed. Access codes are short, rate-limited and expiring.

### Operations (the spine)

| Table | Key columns |
|---|---|
| `requests` | `id`, `hotel_id`, `room_id`, `guest_session_id`, `number` (display `RA-####`), `kind`, `service_id?`, `department_id`, `status`, `quantity`, `guest_note`, `original_text`, `original_locale`, `translated_text`, `translation_provider`, `translation_is_mock`, `assigned_to?`, `estimated_minutes`, `accepted_at`, `started_at`, `on_the_way_at`, `completed_at`, `cancelled_at`, `cancel_reason`, `created_at`, `updated_at` |
| `request_status_history` | `id`, `request_id`, `hotel_id`, `event_type`, `from_status`, `to_status`, `note`, `actor_type`, `actor_staff_id`, `created_at` |
| `orders` | `id` PK **= `request_id`** (1:1), `hotel_id`, `payment_method`, `subtotal_minor`, `total_minor`, `currency`, `item_count` |
| `order_items` | `id`, `order_id`, `hotel_id`, `menu_item_id`, `name_snapshot`, `unit_price_minor`, `quantity`, `line_total_minor`, `note` |
| `feedback` | `id`, `request_id` uq, `hotel_id`, `guest_session_id`, `rating` 1-5, `effort_score` 1-5, `comment`, `locale` |
| `notifications` | `id`, `hotel_id`, `audience`, `guest_session_id?`, `staff_user_id?`, `department_id?`, `request_id?`, `type_key`, `params jsonb`, `read_at` |
| `routing_rules` | `id`, `hotel_id`, `keyword`, `department_id`, `priority` |

**`requests` is one table for all three kinds.** A towel request, a free-text
message and a club sandwich order are all rows in `requests`; an order simply
also has an `orders` row carrying the commercial data. This gives one queue,
one realtime channel, one audit trail, one state machine — and the Admin still
shows "Requests" and "Orders" as separate screens (they are just filters).

`request_status_history` stores notes and assignments as well as status
changes, so the audit timeline is a single ordered read.

`notifications` stores a **`type_key` + params**, never a rendered sentence.
The guest app renders it through i18next, so notifications are multilingual for
free and a new language needs no backend work.

`order_items.name_snapshot` and `unit_price_minor` are frozen at order time —
changing tomorrow's menu price must not rewrite yesterday's revenue.

### Analytics

SQL views + `SECURITY INVOKER` RPCs taking `(hotel_id, from_ts, to_ts)`, so RLS
still applies and a hotel can only aggregate its own rows. No warehouse, no ETL.
Materialise later only if a dashboard gets slow.

---

## 4. Security model

### Identity

- **Staff**: Supabase Auth email+password → `staff_users` row keyed by `auth.uid()`.
- **Guest**: Supabase **anonymous auth**. The app signs in anonymously, then
  calls `redeem-access` with the QR token; the function verifies the token and
  writes a `guest_sessions` row bound to that anonymous `auth.uid()`.
  → The guest gets a genuine JWT with no registration, and Realtime + RLS work
  natively. No custom JWT signing, no service-role key in the browser.
- **Platform**: Supabase Auth → `platform_admins` row.

### RLS helper functions

`SECURITY DEFINER`, `STABLE`, pinned `search_path`, called as `(select fn())` so
Postgres caches them per statement:

```
auth_hotel_id()      auth_role()        auth_department_id()
is_platform_admin()  guest_session_id() guest_hotel_id()
```

`guest_hotel_id()` returns the hotel only while `expires_at > now()` and
`revoked_at is null` — **session expiry is enforced in the database**, not by
the client.

### Policy pattern

| Table group | Guest | Staff | Platform admin |
|---|---|---|---|
| Catalogue, hotel, departments, rooms | SELECT where `hotel_id = guest_hotel_id()` AND `is_active` | SELECT own hotel; INSERT/UPDATE if `hotel_admin`/`manager` | SELECT all |
| `requests`, `request_status_history` | SELECT/INSERT own `guest_session_id`; cancel only while `new` | SELECT/UPDATE own hotel AND (admin/manager OR `department_id = auth_department_id()`) | aggregate counts only |
| `orders`, `order_items` | own session | as above, F&B scoped | counts only |
| `feedback` | INSERT own completed request | SELECT own hotel | counts only |
| `notifications` | own session | own or own department | — |
| `access_tokens` | **no access** | `hotel_admin` only | SELECT all |
| `staff_users` | no access | SELECT own hotel; write `hotel_admin` only | SELECT all |
| `hotels` | SELECT own hotel only | SELECT own; UPDATE `hotel_admin` | full CRUD |

Default deny: RLS enabled on every table, no permissive fallback policy.

### The critical test (Phase 9, automated)

A Hotel A staff JWT issuing `select * from requests where hotel_id = '<hotel B>'`
must return **0 rows**, and an insert/update targeting Hotel B must be rejected.
Written as a pgTAP-style SQL test suite covering every table and every role,
run in CI. A tenant-isolation regression should fail the build.

### Other controls

- Service-role key exists only in Edge Function env. Never in any frontend bundle.
- Zod validation at the client **and** inside the edge function; DB CHECK
  constraints as the last line (`rating between 1 and 5`, positive quantities).
- Status transitions enforced by a DB trigger, not only by UI.
- Rate limiting on `redeem-access` (per IP and per token) against code guessing.
- Data minimisation: no guest name, email, phone, passport or payment data is
  stored. A guest session is a room + a language + an expiry. This is a
  deliberate privacy and GDPR posture, and it is also a sales argument.

---

## 5. Tourist App information architecture

```
/                       resume session or redirect
/welcome                language picker (9 flags/native names, RTL applied live)
/connect                [Scan QR]  or  [Enter access code]
/connect/scan           camera
/connect/code           6–8 char code
  ↓ redeem → guest session created
/home                   hotel logo · hotel name · Room 508
                        "How can we help you?"
                        visual category grid (hotel-controlled)
                        active request strip (live status)
/services               all categories
/services/:category     service list (name, image, price or Free, ETA)
/services/:category/:service
                        detail → quantity ± → optional note → Send Request
/menu                   Food & Drinks (category_type = menu)
/menu/:category         menu items
/menu/item/:id          image, description, allergens, prep time, qty → Add to Cart
/cart                   lines, total, room, note, ○ Charge to Room ○ Pay at Hotel
                        → Place Order
/requests               tabs: Active | Completed
/requests/:id           timeline ✓✓●○ , ETA, live updates, cancel (while New)
/requests/:id/feedback  ★1–5 satisfaction → 1–5 effort → optional comment
/hotel                  about, amenities, opening hours, contact, checkout time
/settings               language, room info, notifications, end session
```

Bottom navigation (5 items, fixed): **Home · Services · My Requests · Hotel · Settings**.
Cart is a floating badge, not a tab — it only exists when non-empty.

Design principles in practice: ≥48px touch targets, 16px+ body text, one primary
action per screen, image-led cards, at most one text input per flow, skeletons
never spinners, optimistic send with a confirmation screen showing `RA-1042` and
the ETA. Arabic flips the entire layout via `dir="rtl"` and CSS logical
properties — not a mirrored stylesheet.

**Target: extra towels requested in 4 taps** from home (Housekeeping → Extra
Towels → qty → Send).

---

## 6. Hotel Admin information architecture

Left sidebar · top bar (hotel switcher for multi-property later, user menu,
live "new requests" counter).

```
/login
/dashboard     KPI row: New · In Progress · Completed Today · Avg Response ·
               Orders Today · Revenue Today · Guest Rating · Effort Score
               + recent requests table
/requests      THE operational screen. Live queue, auto-updating.
               Filters: status · department · room · language · time range
               Columns: RA-# · Room · Category · Service · Language ·
                        Department · Created · Age · Status · Assigned
               Row click → right-hand drawer:
                 original text · translated text (+ "Mock translation" badge)
                 timeline · internal notes
                 actions: Accept · Assign · Start · Set ETA · On the Way ·
                          Complete · Cancel · Add Note
/orders        same engine, kind = order, with items, totals, payment method
/services      categories & services CRUD + translations editor + publish
/menu          menu categories & items, Available / Sold Out / Hidden
/rooms         floors, rooms, active guest session, access status
/departments   department CRUD
/staff         invite, role, department, activate/deactivate
/feedback      ratings, effort scores, comments, filterable
/analytics     operational · guest experience · commercial; Today/7/30/custom
/access        hotel QR, per-room QR, temporary access codes:
               generate · preview · download PNG/PDF · deactivate · regenerate
/settings      hotel profile, locales, currency, operating language, branding

/platform      SUPER ADMIN (platform_admins only, distinct layout)
  /platform/hotels          list · create · activate/deactivate · plan
  /platform/hotels/:id      rooms, request volume, order volume, usage
  /platform/analytics       cross-tenant platform metrics
```

The request queue is the screen staff live in: it must update without a refresh,
be readable across a room, and make the next action obvious. Everything else in
the admin is configuration and can be plainer.

---

## 7. Roles & permissions

The spec listed nine "roles", but seven of them are **departments** that already
exist as data. Modelling them as roles would duplicate the department table in
an enum and force a code change every time a hotel adds one.

**Proposal: permission = `role` × `department`.**

| | Hotel Admin | Manager | Staff |
|---|---|---|---|
| View dashboard | ✓ | ✓ | own department only |
| View requests | all departments | all departments | **own department only** |
| Change request status / assign / note | ✓ | ✓ | own department |
| Manage services & menu | ✓ | ✓ | read |
| Manage rooms, floors, departments | ✓ | ✓ | read |
| Manage staff & roles | ✓ | ✗ | ✗ |
| QR / access tokens | ✓ | ✗ | ✗ |
| Analytics & feedback | ✓ | ✓ | ✗ |
| Hotel settings & branding | ✓ | ✗ | ✗ |

Platform Admin is a separate identity, not a hotel role: hotel CRUD,
activate/deactivate, plans, usage and platform analytics — **not** the right to
read an individual guest's messages.

The matrix lives once in `packages/shared/permissions.ts` (for UI gating) and is
mirrored by RLS policies (for actual enforcement). UI gating is cosmetic; RLS is
the security.

---

## 8. State machines

### Request / Order (one machine, two vocabularies)

```
          ┌──────────────── cancelled ◄──────────────┐
          │                                          │
        new ──► accepted ──► in_progress ──► on_the_way ──► completed
                   │              │                              ▲
                   └──────────────┴──────────────────────────────┘
                        (skips allowed for simple services)
```

| From | Allowed to |
|---|---|
| `new` | `accepted`, `cancelled` |
| `accepted` | `in_progress`, `on_the_way`, `completed`, `cancelled` |
| `in_progress` | `on_the_way`, `completed`, `cancelled` |
| `on_the_way` | `completed`, `cancelled` |
| `completed` | — terminal |
| `cancelled` | — terminal |

Guests may only trigger `new → cancelled`. Staff drive everything else.
Enforced by a Postgres trigger; the same table is exported from `shared` so the
UI can grey out impossible buttons.

**Labels by kind** (same states, different words — this is why one machine works):

| Status | Service request | Food order |
|---|---|---|
| `new` | Request Received | Order Received |
| `accepted` | Accepted | Confirmed |
| `in_progress` | In Progress | Preparing |
| `on_the_way` | On the Way | On the Way |
| `completed` | Completed | Delivered |

Every transition writes a `request_status_history` row and a `notifications` row
(audience = guest) whose `type_key` the guest app renders in their language.

### Guest session

`pending → active → (expired | revoked)`. Active while `now() < expires_at`.
Checked in the database on every query, not in the client.

### Menu item

`available ⇄ sold_out`, either ⇄ `hidden`. Sold Out shows in the app greyed and
unorderable; Hidden does not render at all.

---

## 9. Translation architecture

```
packages/shared/translation/
├─ types.ts        TranslationProvider interface
├─ mock.ts         MockTranslationProvider     (default in dev/demo)
└─ anthropic.ts    ClaudeTranslationProvider   (stub, wired post-MVP)
```

```ts
interface TranslationResult {
  text: string;
  sourceLocale: string;
  targetLocale: string;
  provider: string;      // 'mock' | 'claude' | ...
  isMock: boolean;
  confidence?: number;
}

interface TranslationProvider {
  translate(input: {
    text: string;
    sourceLocale?: string;   // omitted → detect
    targetLocale: string;
  }): Promise<TranslationResult>;
}
```

- Selected by `TRANSLATION_PROVIDER` env var **inside the Edge Function**, so no
  API key ever reaches a browser bundle.
- The mock provider carries a seeded phrase dictionary (including the exact
  Azerbaijani demo sentence) and otherwise returns a clearly marked
  `[mock az→en] …` string.
- `requests.translation_is_mock` is persisted, and the Admin renders an amber
  **"Mock translation"** badge. Nobody can mistake a demo for a real translation.
- Swapping to a real provider is one new file plus one env var. No schema
  change, no UI change, no re-architecture.

### Routing free-text to a department

1. Match the **translated** text against `routing_rules` keywords (highest priority wins).
2. No match → `hotel_settings.freetext_department_id` (Guest Relations / Reception).
3. Staff can reassign in one click; the reassignment is recorded in the timeline.

Deliberately dumb and transparent. Statistical intent classification is POST-MVP.

---

## 10. MVP scope classification

### MUST HAVE FOR MVP
Multi-tenant schema with full RLS · staff auth + roles · QR/code onboarding &
guest sessions · 9 languages incl. RTL · hotel-controlled categories & services ·
structured service requests · **free-text request with translation** ·
department routing · request state machine + audit history · realtime status to
the guest · My Requests · food menu + cart + Charge to Room / Pay at Hotel ·
admin dashboard & live request queue · assignment & status actions ·
service/menu/room/department/staff admin · QR management · feedback (rating +
effort) · core analytics · super admin hotel management · demo data ·
tenant-isolation test suite.

### NICE TO HAVE (build only if Phases 1–7 land early)
Admin bulk auto-translate of catalogue content · keyword routing rules UI ·
CSV export of analytics · dark mode · PWA install prompt & offline shell ·
image upload with crop · saved filter views · staff shift/on-duty view.

### POST-MVP (explicitly not now)
AI concierge · voice · WhatsApp/SMS/push · PMS & POS integration · payment
gateway · marketplace of external businesses (restaurants, museums, tours,
transport, shops, experiences) · loyalty · recommendation engine · multi-property
groups · native mobile apps · billing/subscriptions.

The schema is built so none of these require a redesign — `requests` already has
a `kind`, translation is already an interface, `hotels` already has a `plan`.

---

## 11. Implementation plan

| Phase | Deliverable | Exit criterion |
|---|---|---|
| **1** Foundation | Monorepo, Supabase project, full schema + RLS migrations, auth, design tokens, seed skeleton | A Hotel A staff login can read only Hotel A; isolation test passes |
| **2** Guest onboarding | Language picker, QR/code redemption, guest session, home, category & service discovery | Scanning a Room 508 QR lands on a localised home screen |
| **3** Requests & translation | Structured requests, free-text + translation module, tracker, realtime | **Demo flow test 1** works end to end |
| **4** Admin operations | Dashboard, live queue, drawer, assignment, status actions, audit timeline | Staff can run a request from New to Completed; guest sees each step live |
| **5** Food & orders | Menu browsing, cart, payment method, order queue | **Demo flow test 2** works end to end |
| **6** Hotel configuration | Services, menu, rooms, floors, departments, staff, QR/access admin | A hotel admin can configure a new hotel from empty to live with no developer |
| **7** Feedback & analytics | Rating + effort capture, operational/experience/commercial analytics | Completed requests produce real numbers on the dashboard |
| **8** Super admin | Platform area, hotel CRUD, usage, platform analytics | Three demo hotels visible and manageable |
| **9** Hardening | Tenant isolation suite, role tests, RTL & responsive pass, full E2E, complete demo data | Both demo flows pass automated E2E; isolation suite green |

Phases 1–5 are the demo. Phases 6–9 are what makes it a pilot rather than a demo.

---

## 12. Decisions requiring Product Owner approval

| # | Decision | Recommendation |
|---|---|---|
| 1 | Unify requests & orders into one `requests` spine with a 1:1 `orders` extension | **Yes.** One queue, one state machine, one realtime channel, one audit trail. Admin still shows two screens. |
| 2 | Roles = `hotel_admin/manager/staff` × department, instead of 9 flat roles | **Yes.** Departments are already data; a hotel can add "Pool Bar" without a code change. |
| 3 | Guest identity = Supabase anonymous auth bound to a guest session | **Yes.** Real JWT, no registration, Realtime + RLS work natively, no custom token signing. |
| 4 | Super Admin as a gated `/platform` area inside the admin app vs a third app | **Same app.** It is ~6 screens; a third deployable costs more than it protects. Access is `platform_admins`-gated and RLS-enforced regardless. |
| 5 | Free-text routing = keyword rules + default department | **Yes**, tiny table. Transparent, hotel-editable, demos well. |
| 6 | Supabase: hosted cloud project vs local Docker stack | **Hosted.** This machine has no Docker; hosted also means a live URL to show hotels from day one. |
| 7 | Demo hotel defaults: Aura Grand Hotel, Dubai, AED, staff operating language English | Confirm. |
| 8 | Real translation provider when we leave mock | **Claude API** — one provider covers all 9 languages including Azerbaijani, and handles hospitality tone better than a generic MT engine. Not built now. |
| 9 | Request numbering `RA-####` from a global sequence | Simple and matches the spec examples. Per-hotel numbering is available later if a hotel asks. |

### Blockers before Phase 1 can start

1. **A permanent project folder.** The current session folder is temporary and
   will be deleted.
2. **Node.js is not installed** on this machine (nor npm, pnpm, Docker or
   Homebrew). Node 20+ is required.
3. **A Supabase project** (free tier is sufficient) — URL + anon key + a
   database password.
