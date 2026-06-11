-- =========================================================================
--             1-CartForU: Add Missing Support Schema Columns
-- =========================================================================
-- Run this script in your Supabase SQL Editor to add the missing columns
-- for customer support sessions and messages.
-- =========================================================================

BEGIN;

-- 1. Add missing columns to public.support_sessions
ALTER TABLE public.support_sessions ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.support_sessions ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT TRUE;
ALTER TABLE public.support_sessions ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.support_sessions ADD COLUMN IF NOT EXISTS reseller_id TEXT;
ALTER TABLE public.support_sessions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Add missing columns to public.support_messages
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS attachment_product_id TEXT;

COMMIT;

-- Print confirmation
SELECT 'Successfully added missing support columns in Supabase.' as status;
