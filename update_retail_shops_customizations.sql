-- =========================================================================
--             1-CartForU: Add Customization Columns to Retail Shops
-- =========================================================================
-- Run this script in your Supabase SQL Editor to add the missing shop 
-- customization columns to the retail_shops table.
-- =========================================================================

BEGIN;

-- Add customization columns to public.retail_shops
ALTER TABLE public.retail_shops ADD COLUMN IF NOT EXISTS shop_logo TEXT;
ALTER TABLE public.retail_shops ADD COLUMN IF NOT EXISTS shop_hero_banner TEXT;
ALTER TABLE public.retail_shops ADD COLUMN IF NOT EXISTS store_theme TEXT DEFAULT 'minimal';
ALTER TABLE public.retail_shops ADD COLUMN IF NOT EXISTS shop_slug TEXT;

COMMIT;

-- Print confirmation
SELECT 'Successfully added customization columns to retail_shops table in Supabase.' as status;
