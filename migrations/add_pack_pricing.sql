-- Migration: Add pack pricing columns to plans table
-- Created: 2026-04-28
-- This migration adds support for the new pack-based pricing model

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'pack_price') THEN
    ALTER TABLE plans ADD COLUMN pack_price INTEGER NOT NULL DEFAULT 1000000;
    COMMENT ON COLUMN plans.pack_price IS 'Price in centavos ARS for each paid pack (operations, finance, team, ai)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'bundle_3packs_price') THEN
    ALTER TABLE plans ADD COLUMN bundle_3packs_price INTEGER NOT NULL DEFAULT 2500000;
    COMMENT ON COLUMN plans.bundle_3packs_price IS 'Discounted price in centavos ARS if customer has all 3 operational packs (operations, finance, team)';
  END IF;
END $$;

-- Seed/upsert for the 'base' plan
UPDATE plans
SET pack_price = 1000000, bundle_3packs_price = 2500000
WHERE name = 'base'
  AND (pack_price IS NULL OR pack_price = 0 OR bundle_3packs_price IS NULL OR bundle_3packs_price = 0);
