-- 1. ADD NEW CUSTOMIZATION COLUMNS TO RESELLER_PROFILES
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS shop_logo TEXT;
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS shop_hero_banner TEXT;
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS shop_slug TEXT;
ALTER TABLE IF EXISTS public.reseller_profiles ADD COLUMN IF NOT EXISTS store_theme TEXT;

-- 2. MIGRATE DATA FROM LEGACY bank_info._extra_metadata TO NEW COLUMNS
UPDATE public.reseller_profiles
SET 
  profile_picture = COALESCE(profile_picture, bank_info->'_extra_metadata'->>'profile_picture'),
  shop_logo = COALESCE(shop_logo, bank_info->'_extra_metadata'->>'shop_logo'),
  shop_hero_banner = COALESCE(shop_hero_banner, bank_info->'_extra_metadata'->>'shop_hero_banner'),
  shop_slug = COALESCE(shop_slug, bank_info->'_extra_metadata'->>'shop_slug'),
  store_theme = COALESCE(store_theme, bank_info->'_extra_metadata'->>'store_theme')
WHERE bank_info->'_extra_metadata' IS NOT NULL;

-- 3. CLEAN UP LEGACY bank_info._extra_metadata
UPDATE public.reseller_profiles
SET bank_info = bank_info - '_extra_metadata'
WHERE bank_info->'_extra_metadata' IS NOT NULL;

-- 4. RPC TO EXPORT AUTH USERS (PASSWORD HASHES & METADATA)
CREATE OR REPLACE FUNCTION public.get_auth_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  encrypted_password VARCHAR,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  role VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT 
    u.id, 
    u.email::VARCHAR, 
    u.encrypted_password::VARCHAR, 
    u.raw_app_meta_data, 
    u.raw_user_meta_data, 
    u.role::VARCHAR,
    u.created_at
  FROM auth.users u;
END;
$$ LANGUAGE plpgsql;

-- 5. RPC TO IMPORT AUTH USERS AND IDENTITIES
CREATE OR REPLACE FUNCTION public.import_auth_user(
  p_id UUID,
  p_email VARCHAR,
  p_encrypted_password VARCHAR,
  p_raw_app_meta_data JSONB,
  p_raw_user_meta_data JSONB,
  p_role VARCHAR,
  p_created_at TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmed_at
  ) VALUES (
    p_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', p_role, p_email, p_encrypted_password, p_created_at, p_created_at, p_raw_app_meta_data, p_raw_user_meta_data, p_created_at, p_created_at, p_created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- Insert matching auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    p_id::text, p_id, json_build_object('sub', p_id::text, 'email', p_email)::jsonb, 'email', p_created_at, p_created_at, p_created_at
  )
  ON CONFLICT (provider, id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 6. SECURE RPC FUNCTIONS BY EXCLUDING PUBLIC ACCESS
REVOKE EXECUTE ON FUNCTION public.get_auth_users() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_users() TO service_role;

REVOKE EXECUTE ON FUNCTION public.import_auth_user(UUID, VARCHAR, VARCHAR, JSONB, JSONB, VARCHAR, TIMESTAMP WITH TIME ZONE) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_auth_user(UUID, VARCHAR, VARCHAR, JSONB, JSONB, VARCHAR, TIMESTAMP WITH TIME ZONE) TO service_role;
