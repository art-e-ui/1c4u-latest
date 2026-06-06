-- =========================================================================
--      1-CartForU: Update Orders/Requests Schema & Backfill Metadata
-- =========================================================================
-- Run this script in your Supabase SQL Editor to add missing metadata columns
-- and backfill names, IDs, and details for existing records.
-- =========================================================================

BEGIN;

-- 1. Alter public.orders table to add missing columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reseller_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reseller_numeric_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS staff_username TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_cost NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS products_count INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS focused BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referral_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS member_of_admin_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;

-- 2. Alter public.deposit_requests table to add missing columns
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS reseller_name TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS usdt_address TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS referral_id TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS member_of_admin_id TEXT;
ALTER TABLE public.deposit_requests ADD COLUMN IF NOT EXISTS proof_image TEXT;

-- 3. Alter public.withdrawal_requests table to add missing columns
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS reseller_name TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS usdt_address TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS bank_info JSONB;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS referral_id TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS member_of_admin_id TEXT;

-- 4. Backfill public.orders metadata columns from profiles and users
UPDATE public.orders o
SET 
  reseller_name = COALESCE(o.reseller_name, p.full_name),
  reseller_numeric_id = COALESCE(o.reseller_numeric_id, p.reseller_id),
  total_cost = COALESCE(NULLIF(o.total_cost, 0), o.total_amount, 0)
FROM public.reseller_profiles p
WHERE (o.reseller_id = p.id OR o.reseller_uid = p.id);

UPDATE public.orders o
SET 
  customer_name = COALESCE(o.customer_name, u.first_name || ' ' || u.last_name, u.email),
  customer_email = COALESCE(o.customer_email, u.email)
FROM public.users u
WHERE o.user_id = u.id;

-- 5. Backfill public.deposit_requests metadata columns
UPDATE public.deposit_requests d
SET 
  reseller_name = COALESCE(d.reseller_name, p.full_name),
  reseller_id = COALESCE(d.reseller_id, '1CR' || p.reseller_id)
FROM public.reseller_profiles p
WHERE d.reseller_doc_id = p.id;

-- 6. Backfill public.withdrawal_requests metadata columns
UPDATE public.withdrawal_requests w
SET 
  reseller_name = COALESCE(w.reseller_name, p.full_name),
  reseller_id = COALESCE(w.reseller_id, '1CR' || p.reseller_id)
FROM public.reseller_profiles p
WHERE w.reseller_doc_id = p.id;

COMMIT;
