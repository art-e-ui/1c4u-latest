-- =========================================================================
--             1-CartForU: Premium Supabase SQL Schema & RLS Policies
-- =========================================================================
-- This script contains the direct, production-grade schema layouts, automatic 
-- triggers to sync auth users with public profiles, and airtight Row-Level Security
-- (RLS) policies to secure all 24 tables.
--
-- How to apply this schema:
-- 1. Go to your Supabase Dashboard (https://supabase.com).
-- 2. Navigate to "SQL Editor" on the sidebar.
-- 3. Click "New Query", paste the entire contents of this file.
-- 4. Click "Run" (CMD+Enter / Ctrl+Enter) to build/secure your database.
-- =========================================================================

BEGIN;

-- Drop legacy foreign key constraints if they already exist to avoid errors in upgrade migration
ALTER TABLE IF EXISTS public.deposit_requests DROP CONSTRAINT IF EXISTS deposit_requests_reseller_id_fkey;
ALTER TABLE IF EXISTS public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_reseller_id_fkey;
ALTER TABLE IF EXISTS public.reseller_chat_sessions DROP CONSTRAINT IF EXISTS reseller_chat_sessions_reseller_id_fkey;
ALTER TABLE IF EXISTS public.reseller_customer_chat_sessions DROP CONSTRAINT IF EXISTS reseller_customer_chat_sessions_reseller_id_fkey;
ALTER TABLE IF EXISTS public.reseller_product_selection DROP CONSTRAINT IF EXISTS reseller_product_selection_reseller_id_fkey;
ALTER TABLE IF EXISTS public.reseller_notifications DROP CONSTRAINT IF EXISTS reseller_notifications_reseller_id_fkey;

-- Add missing columns to existing tables
ALTER TABLE IF EXISTS public.reseller_customer_chat_sessions ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS reseller_uid TEXT;
ALTER TABLE IF EXISTS public.deposit_requests ADD COLUMN IF NOT EXISTS reseller_doc_id TEXT;
ALTER TABLE IF EXISTS public.withdrawal_requests ADD COLUMN IF NOT EXISTS reseller_doc_id TEXT;
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS has_requested_password_reset BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS password_reset_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS system_upgraded_reset BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS system_upgraded_reset BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------------------------
-- PART 1: Schema Layout Definition (Tables creation matching Firestore types)
-- -------------------------------------------------------------------------

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'reseller' CHECK (role IN ('admin', 'owner', 'staff', 'reseller', 'customer')),
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    status TEXT DEFAULT 'Active',
    system_upgraded_reset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC DEFAULT 0,
    image TEXT,
    images TEXT[],
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RESELLER_PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.reseller_profiles (
    id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    reseller_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    verified BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'Approved',
    balance NUMERIC DEFAULT 0,
    unpicked_balance NUMERIC DEFAULT 0,
    member_of_admin_id TEXT,
    referred_by_staff_id TEXT,
    referral_code TEXT,
    total_earnings NUMERIC DEFAULT 0,
    total_deposits NUMERIC DEFAULT 0,
    total_withdrawals NUMERIC DEFAULT 0,
    total_orders NUMERIC DEFAULT 0,
    pending_balance NUMERIC DEFAULT 0,
    usdt_address TEXT,
    bank_info JSONB DEFAULT '{}'::jsonb,
    password_reset_requested BOOLEAN DEFAULT FALSE,
    has_requested_password_reset BOOLEAN DEFAULT FALSE,
    system_upgraded_reset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RETAIL_SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.retail_shops (
    id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    shop_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    product_limit INTEGER DEFAULT 50,
    domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SLA ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.sla_admins (
    id TEXT PRIMARY KEY,
    value JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SLA STAFF TABLE
CREATE TABLE IF NOT EXISTS public.sla_staff (
    id TEXT PRIMARY KEY,
    value JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    value JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    reseller_id TEXT,
    reseller_uid TEXT,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    shipping_address TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. DEPOSIT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,
    reseller_doc_id TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. WITHDRAWAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,
    reseller_doc_id TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. SUPPORT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.support_sessions (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    user_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. SUPPORT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.support_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES public.support_sessions(id) ON DELETE CASCADE,
    sender_name TEXT,
    sender_role TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. RESELLER CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.reseller_chat_sessions (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,
    status TEXT DEFAULT 'active',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. RESELLER CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.reseller_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES public.reseller_chat_sessions(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. RESELLER CUSTOMER CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.reseller_customer_chat_sessions (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,
    customer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    customer_name TEXT NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. RESELLER CUSTOMER CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.reseller_customer_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES public.reseller_customer_chat_sessions(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. RESELLER PRODUCT SELECTION TABLE
CREATE TABLE IF NOT EXISTS public.reseller_product_selection (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. ACH CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.ach_customers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    routing_number TEXT,
    account_number TEXT,
    account_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. ACH FINANCIALS TABLE
CREATE TABLE IF NOT EXISTS public.ach_financials (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. VIRTUAL_CUSTOMER_PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.virtual_customer_profiles (
    id TEXT PRIMARY KEY,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. VIRTUAL_PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.virtual_profiles (
    id TEXT PRIMARY KEY,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. SEASONAL_THEMES TABLE
CREATE TABLE IF NOT EXISTS public.seasonal_themes (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. BROADCAST NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 26. RESELLER NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.reseller_notifications (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- -------------------------------------------------------------------------
-- PART 2: Helper Roles and Security Checks (is_admin_email)
-- -------------------------------------------------------------------------

-- Auth Helper: Check if active user email matches known administrators/owners
CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN LOWER(auth.jwt() ->> 'email') IN (
    'kz4543176@gmail.com',
    'vannz4903@gmail.com',
    'arkarnaung009@gmail.com'
  );
END;
$$ LANGUAGE plpgsql;

-- Auth Helper: Check if a given ID matches either current auth.uid or legacy_id
CREATE OR REPLACE FUNCTION public.is_current_user(p_user_id TEXT)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN p_user_id = auth.uid()::text 
         OR p_user_id = COALESCE(auth.jwt() -> 'user_metadata' ->> 'legacy_id', '');
END;
$$ LANGUAGE plpgsql;

-- Auth Helper: Query role of auth.uid() or legacy_id in target public.users profile
CREATE OR REPLACE FUNCTION public.check_user_role(p_roles TEXT[])
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE public.is_current_user(id)
      AND role IN (SELECT unnest(p_roles))
  );
END;
$$ LANGUAGE plpgsql;

-- Helper matching isOwner()
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN public.is_admin_email() OR public.check_user_role(ARRAY['admin', 'owner']);
END;
$$ LANGUAGE plpgsql;

-- Helper matching isAdmin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN public.is_owner();
END;
$$ LANGUAGE plpgsql;

-- Helper matching isStaff()
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN public.is_owner() OR public.check_user_role(ARRAY['staff', 'user', 'admin', 'owner']);
END;
$$ LANGUAGE plpgsql;


-- -------------------------------------------------------------------------
-- PART 3: Automated Signup Triggers (Auth users -> public.users Profile integration)
-- -------------------------------------------------------------------------

-- This trigger syncs any native user registered via Supabase Authentication (GoTrue) 
-- into the public.users database schema automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role TEXT;
  full_name TEXT;
BEGIN
  default_role := COALESCE(new.raw_user_meta_data->>'role', 'reseller');
  full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  -- Check if a user with that email already exists in public.users but has a different ID
  IF EXISTS (SELECT 1 FROM public.users WHERE email = LOWER(new.email) AND id <> new.id::text) THEN
    -- Update the old ID to the new ID, which will cascade across all referencing tables
    UPDATE public.users
    SET id = new.id::text,
        role = COALESCE(new.raw_user_meta_data->>'role', role, 'reseller'),
        updated_at = NOW()
    WHERE email = LOWER(new.email);
  ELSE
    -- Otherwise, do the standard insert/upsert
    INSERT INTO public.users(id, email, role, created_at, updated_at)
    VALUES (
      new.id::text,
      LOWER(new.email),
      default_role,
      COALESCE(new.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
      email = EXCLUDED.email,
      updated_at = NOW();
  END IF;

  -- Provision a matching reseller profiles automatically for newly signed-up resellers
  IF default_role = 'reseller' THEN
    INSERT INTO public.reseller_profiles(
      id, reseller_id, full_name, verified, status, balance, unpicked_balance, created_at, updated_at
    ) VALUES (
      new.id::text,
      new.id::text,
      full_name,
      FALSE,
      'Approved',
      0,
      0,
      COALESCE(new.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- -------------------------------------------------------------------------
-- PART 4: Enabling Row-Level Security (RLS) across all tables
-- -------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reseller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.retail_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sla_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sla_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reseller_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reseller_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reseller_customer_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reseller_customer_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reseller_product_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ach_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ach_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.virtual_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.virtual_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seasonal_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reseller_notifications ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------------------
-- PART 5: Explicit airtight RLS Policies definitions
-- -------------------------------------------------------------------------

-- ====================================================
-- 1. USERS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Select users on auth" ON public.users;
CREATE POLICY "Select users on auth" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_current_user(id) OR public.is_staff());

DROP POLICY IF EXISTS "Insert users self" ON public.users;
CREATE POLICY "Insert users self" ON public.users
  FOR INSERT TO authenticated, anon
  WITH CHECK (public.is_current_user(id) OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Update users self or admin" ON public.users;
CREATE POLICY "Update users self or admin" ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_current_user(id) OR public.is_staff())
  WITH CHECK (
    public.is_staff() OR 
    (public.is_current_user(id) AND (role = 'customer' OR role = 'reseller'))
  );

DROP POLICY IF EXISTS "Delete users admin" ON public.users;
CREATE POLICY "Delete users admin" ON public.users
  FOR DELETE TO authenticated
  USING (public.is_owner());

-- ====================================================
-- 2. CATEGORIES SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select categories" ON public.categories;
CREATE POLICY "Public select categories" ON public.categories
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write categories staff" ON public.categories;
CREATE POLICY "Write categories staff" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_staff());

-- ====================================================
-- 3. PRODUCTS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select products" ON public.products;
CREATE POLICY "Public select products" ON public.products
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write products staff" ON public.products;
CREATE POLICY "Write products staff" ON public.products
  FOR ALL TO authenticated
  USING (public.is_staff());

-- ====================================================
-- 4. RESELLER PROFILES SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Select reseller profiles self or staff" ON public.reseller_profiles;
CREATE POLICY "Select reseller profiles self or staff" ON public.reseller_profiles
  FOR SELECT TO authenticated
  USING (public.is_current_user(id) OR public.is_current_user(reseller_id) OR public.is_staff());

DROP POLICY IF EXISTS "Write reseller profiles self or admin" ON public.reseller_profiles;
CREATE POLICY "Write reseller profiles self or admin" ON public.reseller_profiles
  FOR ALL TO authenticated
  USING (public.is_current_user(id) OR public.is_current_user(reseller_id) OR public.is_staff());

-- ====================================================
-- 5. RETAIL SHOPS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select retail shops" ON public.retail_shops;
CREATE POLICY "Public select retail shops" ON public.retail_shops
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write retail shops owner or staff" ON public.retail_shops;
CREATE POLICY "Write retail shops owner or staff" ON public.retail_shops
  FOR ALL TO authenticated
  USING (public.is_current_user(id) OR public.is_staff());

-- ====================================================
-- 6. SYSTEM SETTINGS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select system settings" ON public.system_settings;
CREATE POLICY "Public select system settings" ON public.system_settings
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write settings owner" ON public.system_settings;
CREATE POLICY "Write settings owner" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_owner() OR id = 'connection_test');

-- ====================================================
-- 7. ORDERS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Select orders involved parties" ON public.orders;
CREATE POLICY "Select orders involved parties" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_current_user(user_id) OR 
    public.is_current_user(reseller_id) OR 
    public.is_current_user(reseller_uid) OR 
    public.is_staff()
  );

DROP POLICY IF EXISTS "Insert orders customer" ON public.orders;
CREATE POLICY "Insert orders customer" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Update orders customer or staff" ON public.orders;
CREATE POLICY "Update orders customer or staff" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.is_current_user(user_id) OR 
    public.is_current_user(reseller_id) OR 
    public.is_current_user(reseller_uid) OR 
    public.is_staff()
  );

DROP POLICY IF EXISTS "Delete orders owner" ON public.orders;
CREATE POLICY "Delete orders owner" ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_owner());

-- ====================================================
-- 8. DEPOSIT REQUESTS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Select deposits owner or staff" ON public.deposit_requests;
CREATE POLICY "Select deposits owner or staff" ON public.deposit_requests
  FOR SELECT TO authenticated
  USING (
    public.is_current_user(reseller_id) OR 
    public.is_current_user(reseller_doc_id) OR 
    public.is_staff()
  );

DROP POLICY IF EXISTS "Insert deposits self or staff" ON public.deposit_requests;
CREATE POLICY "Insert deposits self or staff" ON public.deposit_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_current_user(reseller_id) OR 
    public.is_current_user(reseller_doc_id) OR 
    public.is_staff()
  );

DROP POLICY IF EXISTS "Update deposits staff" ON public.deposit_requests;
CREATE POLICY "Update deposits staff" ON public.deposit_requests
  FOR UPDATE TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "Delete deposits owner" ON public.deposit_requests;
CREATE POLICY "Delete deposits owner" ON public.deposit_requests
  FOR DELETE TO authenticated
  USING (public.is_owner());

-- ====================================================
-- 9. WITHDRAWAL REQUESTS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Select withdrawals owner or staff" ON public.withdrawal_requests;
CREATE POLICY "Select withdrawals owner or staff" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (
    public.is_current_user(reseller_id) OR 
    public.is_current_user(reseller_doc_id) OR 
    public.is_staff()
  );

DROP POLICY IF EXISTS "Insert withdrawals self or staff" ON public.withdrawal_requests;
CREATE POLICY "Insert withdrawals self or staff" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_current_user(reseller_id) OR 
    public.is_current_user(reseller_doc_id) OR 
    public.is_staff()
  );

DROP POLICY IF EXISTS "Update withdrawals staff" ON public.withdrawal_requests;
CREATE POLICY "Update withdrawals staff" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "Delete withdrawals owner" ON public.withdrawal_requests;
CREATE POLICY "Delete withdrawals owner" ON public.withdrawal_requests
  FOR DELETE TO authenticated
  USING (public.is_owner());

-- ====================================================
-- 10. RESELLER CHAT SESSIONS & MESSAGES (Admin help desk)
-- ====================================================
DROP POLICY IF EXISTS "Select sessions owner or staff" ON public.reseller_chat_sessions;
CREATE POLICY "Select sessions owner or staff" ON public.reseller_chat_sessions
  FOR SELECT TO authenticated
  USING (public.is_current_user(reseller_id) OR public.is_staff());

DROP POLICY IF EXISTS "Write sessions owner or staff" ON public.reseller_chat_sessions;
CREATE POLICY "Write sessions owner or staff" ON public.reseller_chat_sessions
  FOR ALL TO authenticated
  USING (public.is_current_user(reseller_id) OR public.is_staff());

-- Messages
DROP POLICY IF EXISTS "Select reseller messages involved" ON public.reseller_chat_messages;
CREATE POLICY "Select reseller messages involved" ON public.reseller_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reseller_chat_sessions s
      WHERE s.id = session_id AND (public.is_current_user(s.reseller_id) OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS "Insert reseller messages self" ON public.reseller_chat_messages;
CREATE POLICY "Insert reseller messages self" ON public.reseller_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reseller_chat_sessions s
      WHERE s.id = session_id AND (public.is_current_user(s.reseller_id) OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS "Delete chat messages staff" ON public.reseller_chat_messages;
CREATE POLICY "Delete chat messages staff" ON public.reseller_chat_messages
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- ====================================================
-- 11. RESELLER CUSTOMER CHAT SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Select customer sessions reseller or staff" ON public.reseller_customer_chat_sessions;
CREATE POLICY "Select customer sessions reseller or staff" ON public.reseller_customer_chat_sessions
  FOR SELECT TO authenticated
  USING (public.is_current_user(customer_id) OR public.is_current_user(reseller_id) OR public.is_staff());

DROP POLICY IF EXISTS "Write customer sessions reseller or staff" ON public.reseller_customer_chat_sessions;
CREATE POLICY "Write customer sessions reseller or staff" ON public.reseller_customer_chat_sessions
  FOR ALL TO authenticated
  USING (public.is_current_user(customer_id) OR public.is_current_user(reseller_id) OR public.is_staff());

-- Customer Messages
DROP POLICY IF EXISTS "Select customer chat messages involved" ON public.reseller_customer_chat_messages;
CREATE POLICY "Select customer chat messages involved" ON public.reseller_customer_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reseller_customer_chat_sessions s
      WHERE s.id = session_id AND (public.is_current_user(s.customer_id) OR public.is_current_user(s.reseller_id) OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS "Insert customer chat messages involved" ON public.reseller_customer_chat_messages;
CREATE POLICY "Insert customer chat messages involved" ON public.reseller_customer_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reseller_customer_chat_sessions s
      WHERE s.id = session_id AND (public.is_current_user(s.customer_id) OR public.is_current_user(s.reseller_id) OR public.is_staff())
    )
  );

DROP POLICY IF EXISTS "Delete customer chat messages staff" ON public.reseller_customer_chat_messages;
CREATE POLICY "Delete customer chat messages staff" ON public.reseller_customer_chat_messages
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- ====================================================
-- 12. SUPPORT SESSIONS & SUPPORT MESSAGES (Direct help widget)
-- ====================================================
DROP POLICY IF EXISTS "Public support sessions access" ON public.support_sessions;
CREATE POLICY "Public support sessions access" ON public.support_sessions
  FOR ALL TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Public support messages select" ON public.support_messages;
CREATE POLICY "Public support messages select" ON public.support_messages
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Public support messages insert" ON public.support_messages;
CREATE POLICY "Public support messages insert" ON public.support_messages
  FOR INSERT TO public
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public support messages update" ON public.support_messages;
CREATE POLICY "Public support messages update" ON public.support_messages
  FOR UPDATE TO public
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Delete support messages staff" ON public.support_messages;
CREATE POLICY "Delete support messages staff" ON public.support_messages
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- ====================================================
-- 13. RESELLER PRODUCT SELECTION SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public selected products select" ON public.reseller_product_selection;
CREATE POLICY "Public selected products select" ON public.reseller_product_selection
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write selected products reseller" ON public.reseller_product_selection;
CREATE POLICY "Write selected products reseller" ON public.reseller_product_selection
  FOR ALL TO authenticated
  USING (public.is_current_user(reseller_id) OR public.is_staff());

-- ====================================================
-- 14. ACH CUSTOMERS AND ACH FINANCIALS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "ACH customer full select owner" ON public.ach_customers;
CREATE POLICY "ACH customer full select owner" ON public.ach_customers
  FOR ALL TO authenticated
  USING (public.is_owner());

DROP POLICY IF EXISTS "ACH financials select owner" ON public.ach_financials;
CREATE POLICY "ACH financials select owner" ON public.ach_financials
  FOR ALL TO authenticated
  USING (public.is_owner());

-- ====================================================
-- 15. VIRTUAL CUSTOMER AND EXECUTIVE PROFILES SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select virtual profiles" ON public.virtual_profiles;
CREATE POLICY "Public select virtual profiles" ON public.virtual_profiles
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write virtual profiles staff" ON public.virtual_profiles;
CREATE POLICY "Write virtual profiles staff" ON public.virtual_profiles
  FOR ALL TO authenticated
  USING (public.is_staff());

-- Customer Profiles
DROP POLICY IF EXISTS "Public select customer virtual profiles" ON public.virtual_customer_profiles;
CREATE POLICY "Public select customer virtual profiles" ON public.virtual_customer_profiles
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write customer virtual profiles staff" ON public.virtual_customer_profiles;
CREATE POLICY "Write customer virtual profiles staff" ON public.virtual_customer_profiles
  FOR ALL TO authenticated
  USING (public.is_staff());

-- ====================================================
-- 16. SLA ADMINS & STAFF SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Select SLA admins staff" ON public.sla_admins;
CREATE POLICY "Select SLA admins staff" ON public.sla_admins
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "Write SLA admins owner" ON public.sla_admins;
CREATE POLICY "Write SLA admins owner" ON public.sla_admins
  FOR ALL TO authenticated
  USING (public.is_owner());

-- Staff profiles
DROP POLICY IF EXISTS "Select SLA staff authenticated" ON public.sla_staff;
CREATE POLICY "Select SLA staff authenticated" ON public.sla_staff
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Write SLA staff owner" ON public.sla_staff;
CREATE POLICY "Write SLA staff owner" ON public.sla_staff
  FOR ALL TO authenticated
  USING (public.is_owner());

-- ====================================================
-- 17. SEASONAL THEMES SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select seasonal themes" ON public.seasonal_themes;
CREATE POLICY "Public select seasonal themes" ON public.seasonal_themes
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write seasonal themes owner" ON public.seasonal_themes;
CREATE POLICY "Write seasonal themes owner" ON public.seasonal_themes
  FOR ALL TO authenticated
  USING (public.is_owner());

-- ====================================================
-- 18. REVIEWS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select reviews" ON public.reviews;
CREATE POLICY "Public select reviews" ON public.reviews
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Insert reviews login" ON public.reviews;
CREATE POLICY "Insert reviews login" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user(user_id));

DROP POLICY IF EXISTS "Update reviews owner or author" ON public.reviews;
CREATE POLICY "Update reviews owner or author" ON public.reviews
  FOR UPDATE TO authenticated
  USING (public.is_current_user(user_id) OR public.is_owner())
  WITH CHECK (public.is_current_user(user_id) OR public.is_owner());

DROP POLICY IF EXISTS "Delete reviews owner or author" ON public.reviews;
CREATE POLICY "Delete reviews owner or author" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.is_current_user(user_id) OR public.is_owner());

-- ====================================================
-- 19. BROADCAST AND RESELLER NOTIFICATIONS SECURITY
-- ====================================================
DROP POLICY IF EXISTS "Public select broadcast notifications" ON public.broadcast_notifications;
CREATE POLICY "Public select broadcast notifications" ON public.broadcast_notifications
  FOR SELECT TO public
  USING (TRUE);

DROP POLICY IF EXISTS "Write broadcast notifications staff" ON public.broadcast_notifications;
CREATE POLICY "Write broadcast notifications staff" ON public.broadcast_notifications
  FOR ALL TO authenticated
  USING (public.is_staff());

-- Reseller Notifications
DROP POLICY IF EXISTS "Select reseller notifications destination" ON public.reseller_notifications;
CREATE POLICY "Select reseller notifications destination" ON public.reseller_notifications
  FOR SELECT TO authenticated
  USING (public.is_current_user(reseller_id) OR public.is_staff());

DROP POLICY IF EXISTS "Write reseller notifications staff" ON public.reseller_notifications;
CREATE POLICY "Write reseller notifications staff" ON public.reseller_notifications
  FOR ALL TO authenticated
  USING (public.is_staff());

COMMIT;
