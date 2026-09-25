# ROOM-AURA — demo credentials

Non-production, non-secret-in-the-real-sense credentials for the two seed
tenants created by `pnpm seed` (see [scripts/seed.ts](../scripts/seed.ts) and
[scripts/demo-data.ts](../scripts/demo-data.ts)). Safe to share with hotel
managers or pilot testers during a demo — these accounts exist only to prove
tenant isolation and the core flows, and store no real guest data.

Password for every account below: **`RoomAura!Demo1`**

## Hotel A — Aura Grand Hotel (Dubai, UAE)

The real demo tenant. Includes Room 508, used in the spec's end-to-end demo
scenario.

| Email | Role | Department |
|---|---|---|
| `admin@auragrand.demo` | hotel_admin | — (all departments) |
| `sarah@auragrand.demo` | staff | Housekeeping |

## Hotel B — Bosporus Hotel (Istanbul, Turkey)

Exists purely as a second tenant for the automated tenant-isolation test
(`pnpm test:isolation`) to probe. Minimal data only.

| Email | Role | Department |
|---|---|---|
| `admin@bosporus.demo` | hotel_admin | — (all departments) |

## Catalogue (Hotel A only)

A minimal Housekeeping category — Extra Towels and Room Cleaning — enough to
exercise the structured-request flow. The full catalogue admin UI is Phase 6.

## Free-text routing (Hotel A only)

`routing_rules` keywords: `towel`, `clean`, `pillow` → Housekeeping;
`air condition` → Maintenance; `transfer` → Transportation. Anything else
falls back to `hotel_settings.freetext_department_id` → Guest Relations.

## Regenerating

`pnpm seed` is idempotent for hotels/departments/rooms/staff, but the
Room 508 QR token and hotel-wide access code **rotate on every run** — check
`scripts/.demo-ids.json` for the current values after seeding. The catalogue
is only created once (skipped on later runs if the hotel already has any
category).
