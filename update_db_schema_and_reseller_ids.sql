-- =========================================================================
--      1-CartForU: Fix Database Schema Column Types & Reseller IDs
-- =========================================================================
-- Run this script in your Supabase SQL Editor to add missing columns,
-- fix UUID-like reseller IDs, and sync profiles.
-- =========================================================================

BEGIN;

-- 1. Add missing columns to public.retail_shops
ALTER TABLE public.retail_shops ADD COLUMN IF NOT EXISTS reseller_id TEXT;
ALTER TABLE public.retail_shops ADD COLUMN IF NOT EXISTS star_rating NUMERIC DEFAULT 2.0;
ALTER TABLE public.retail_shops ADD COLUMN IF NOT EXISTS credit_score INTEGER DEFAULT 100;

-- 2. Assign numeric reseller_id to profiles that currently have non-numeric/UUID IDs
DO $$
DECLARE
    next_id INTEGER := 25039;
    r RECORD;
BEGIN
    FOR r IN (
        SELECT id, reseller_id
        FROM public.reseller_profiles
        WHERE reseller_id IS NULL OR reseller_id = '' OR reseller_id !~ '^[0-9]+$'
        ORDER BY created_at ASC
    ) LOOP
        UPDATE public.reseller_profiles
        SET reseller_id = next_id::text,
            updated_at = NOW()
        WHERE id = r.id;
        
        RAISE NOTICE 'Reassigned non-numeric reseller_id for profile % from % to %', r.id, r.reseller_id, next_id;
        next_id := next_id + 1;
    END LOOP;
END $$;

-- 3. Synchronize retail_shops.reseller_id from reseller_profiles.reseller_id
UPDATE public.retail_shops s
SET reseller_id = p.reseller_id,
    updated_at = NOW()
FROM public.reseller_profiles p
WHERE s.id = p.id;

-- 4. Fill default values for star_rating and credit_score in retail_shops if null
UPDATE public.retail_shops
SET star_rating = COALESCE(star_rating, 2.0),
    credit_score = COALESCE(credit_score, 100);

COMMIT;

-- Verification Queries
SELECT 'SUCCESS' AS status;
