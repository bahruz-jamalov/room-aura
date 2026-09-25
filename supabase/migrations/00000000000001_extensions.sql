-- ROOM-AURA — Extensions
-- pgcrypto: gen_random_uuid() for primary keys
-- pg_trgm: fuzzy matching, useful later for routing_rules keyword search
create extension if not exists pgcrypto with schema public;
create extension if not exists pg_trgm with schema public;
