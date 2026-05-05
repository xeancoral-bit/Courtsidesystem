-- Final, Forceful Permission Fix for has_role
-- This script ensures that EVERY role has execute permission on the has_role function.
-- Run this in your Supabase SQL Editor if you are still seeing 'permission denied'.

-- 1. Grant Usage on public schema (just in case)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant Execute on the function to everyone (PUBLIC)
-- This includes anon, authenticated, and service_role.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

-- 3. Also grant permissions on the other admin functions
GRANT EXECUTE ON FUNCTION public.admin_grant_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_partner_application(UUID, BOOLEAN, TEXT) TO authenticated, service_role;

-- 4. Ensure RLS policies don't block the has_role check itself
-- (Function is already SECURITY DEFINER, so this is usually fine)
ALTER FUNCTION public.has_role(UUID, public.app_role) SECURITY DEFINER;
