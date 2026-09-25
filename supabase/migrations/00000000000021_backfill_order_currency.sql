-- ROOM-AURA — backfill orders.currency for rows created before migration
-- 00000000000018 (the SECURITY DEFINER fix for create_order).
--
-- Found while building Phase 8's platform_hotel_stats RPC: Aura Grand
-- Hotel's revenue showed up split across two currencies (AED 8.00 + USD
-- 33.00) even though it only ever sells in AED. The two USD rows (RA-1007
-- Club Sandwich, RA-1008 Fresh Orange Juice) are exactly the orders placed
-- before migration 18 landed — create_order's own currency UPDATE was
-- being silently dropped by RLS at insert time (00000000000018's comment
-- explains why), leaving them stuck on the 'USD' placeholder from
-- create_order's initial insert. That bug was fixed going forward; these
-- two rows are the only ones it left behind and were never corrected.
--
-- This assumes one currency per hotel (already the documented assumption
-- behind create_order itself, migration 00000000000017) and corrects each
-- order to its own hotel's real currency.
update orders o
set currency = h.currency
from hotels h
where o.hotel_id = h.id
  and o.currency <> h.currency;
