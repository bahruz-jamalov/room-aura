-- ROOM-AURA — "Charge to room" only makes sense for a shop the hotel
-- itself fulfils (it posts to the guest's own folio). An external shop
-- under "Explore the City" has no folio to post to, so it must not offer
-- that payment method at all — this is a property of the shop
-- (service_categories), not something the guest should be asked to get
-- right.
alter table service_categories
  add column allows_room_charge boolean not null default true;
