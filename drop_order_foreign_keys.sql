-- =========================================================================
--             1-CartForU: Drop Orders Foreign Key Constraints
-- =========================================================================
-- Run this script in your Supabase SQL Editor to drop the strict foreign
-- key constraints on the orders table. This is required to allow virtual
-- customer profiles (e.g. vp-1, vp-2) to place virtual orders successfully.
-- =========================================================================

BEGIN;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_reseller_uid_fkey;

COMMIT;
