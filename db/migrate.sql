-- Idempotent upgrade script for an EXISTING database.
-- Run after pulling updates: docker exec -i boodschappen-db psql -U boodschappen -d boodschappen < db/migrate.sql
-- Fresh databases get the full schema from db/migrations/ instead.

ALTER TABLE recipe_items ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1);
ALTER TABLE recurring_items ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1);
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1);

ALTER TABLE recipe_items ADD COLUMN IF NOT EXISTS optional BOOLEAN NOT NULL DEFAULT FALSE;
