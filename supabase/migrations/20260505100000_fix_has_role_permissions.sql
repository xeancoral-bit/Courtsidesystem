-- Fix permission denied for has_role function
-- This allows the authenticated and anon roles to execute the role check function,
-- which is required for RLS policies to function correctly.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- Also ensure the other admin functions have correct permissions for the authenticated role
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_password_reset(uuid) TO authenticated;
