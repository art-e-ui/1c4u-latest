-- =========================================================================
--             1-CartForU: Add Missing Reseller Schema Columns & Align IDs
-- =========================================================================
-- Run this script in your Supabase SQL Editor to add the missing columns 
-- and fix legacy Firebase ID mismatches.
-- =========================================================================

BEGIN;

-- 1. Add missing columns to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 2. Add missing columns to public.reseller_profiles
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS member_of_admin_id TEXT;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS referred_by_staff_id TEXT;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS total_deposits NUMERIC DEFAULT 0;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS total_withdrawals NUMERIC DEFAULT 0;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS total_orders NUMERIC DEFAULT 0;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS pending_balance NUMERIC DEFAULT 0;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS usdt_address TEXT;
ALTER TABLE public.reseller_profiles ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}'::jsonb;

-- 3. Re-create foreign key constraints on public.orders with ON UPDATE CASCADE enabled
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_reseller_uid_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_reseller_uid_fkey FOREIGN KEY (reseller_uid) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 4. Align IDs in public.users to match auth.users IDs based on email
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT au.id AS auth_id, pu.id AS public_id, au.email 
        FROM auth.users au
        JOIN public.users pu ON LOWER(au.email) = LOWER(pu.email)
        WHERE au.id::text <> pu.id
    ) LOOP
        BEGIN
            UPDATE public.users 
            SET id = r.auth_id 
            WHERE id = r.public_id;
            
            RAISE NOTICE 'Aligned ID for user % from % to %', r.email, r.public_id, r.auth_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to align ID for user %: %', r.email, SQLERRM;
        END;
    END LOOP;
END $$;

COMMIT;

-- Print confirmation
SELECT 'Successfully added missing reseller columns and aligned legacy IDs in Supabase.' as status;
