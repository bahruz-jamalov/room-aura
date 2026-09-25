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

## Regenerating

`pnpm seed` is idempotent — re-running it after schema changes is safe and
won't duplicate hotels, departments, rooms or staff.
