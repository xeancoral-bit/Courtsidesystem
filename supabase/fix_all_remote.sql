-- =============================================================================
-- COURTSIDE · COMPLETE DATABASE FIX SCRIPT
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- =======================
-- SECTION 1: has_role PERMISSIONS FIX
-- =======================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant execute on has_role to ALL roles (fixes "permission denied for function has_role")
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

-- Ensure function is SECURITY DEFINER
ALTER FUNCTION public.has_role(UUID, public.app_role) SECURITY DEFINER;

-- Grant on admin helper functions
GRANT EXECUTE ON FUNCTION public.admin_grant_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(UUID, public.app_role) TO authenticated, service_role;

-- =======================
-- SECTION 2: audit_logs TABLE
-- =======================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Allow inserts from authenticated users (logs their own actions)
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Function to log actions via RPC
CREATE OR REPLACE FUNCTION public.log_action(
    p_action TEXT,
    p_target_type TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
    VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_action(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Enable realtime on audit_logs
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- =======================
-- SECTION 3: system_settings TABLE
-- =======================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings (e.g. site name, maintenance mode)
DROP POLICY IF EXISTS "Public settings viewable" ON public.system_settings;
CREATE POLICY "Public settings viewable"
ON public.system_settings FOR SELECT TO public
USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;
CREATE POLICY "Admins can update settings"
ON public.system_settings FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Only admins can insert settings
DROP POLICY IF EXISTS "Admins can insert settings" ON public.system_settings;
CREATE POLICY "Admins can insert settings"
ON public.system_settings FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Seed default settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('site_config', '{"name": "Courtside", "email": "admin@courtside.ph", "maintenance": false}'::jsonb, 'General platform configuration'),
    ('security_policy', '{"max_login_attempts": 5, "require_mfa": false, "session_timeout": 3600}'::jsonb, 'Security and authentication rules'),
    ('branding', '{"primary_color": "#d4af37", "logo_url": null, "theme": "artisanal"}'::jsonb, 'Visual identity and theme overrides')
ON CONFLICT (key) DO NOTHING;

-- =======================
-- SECTION 4: BOOKINGS — reminder_text column & realtime
-- =======================

-- Add reminder_text column if missing
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS reminder_text TEXT;

-- Enable full replication for realtime
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add bookings to realtime publication (ignore error if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN others THEN
    NULL; -- Already added, ignore
END;
$$;

-- =======================
-- SECTION 5: BOOKING RLS — owner & admin update policies
-- =======================

-- Owners can update bookings for their facilities
DROP POLICY IF EXISTS "Owners can manage bookings for their facilities" ON public.bookings;
CREATE POLICY "Owners can manage bookings for their facilities"
ON public.bookings FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.facilities f
        WHERE f.id = bookings.facility_id
        AND f.owner_id = auth.uid()
    )
);

-- Admins can update any booking
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
CREATE POLICY "Admins can update all bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =======================
-- SECTION 6: FIX RELATIONS (for PostgREST auto-joins)
-- =======================

-- bookings.user_id → profiles.id (needed so BookingCalendar can join user info)
ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- facilities.owner_id → profiles.id (needed for owner info joins)
ALTER TABLE public.facilities
    DROP CONSTRAINT IF EXISTS facilities_owner_id_fkey;

ALTER TABLE public.facilities
    ADD CONSTRAINT facilities_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- =======================
-- DONE
-- =======================
DO $$ BEGIN
    RAISE NOTICE '✅ All fixes applied successfully!';
    RAISE NOTICE '   - has_role permissions granted';
    RAISE NOTICE '   - audit_logs table created + RLS configured';
    RAISE NOTICE '   - system_settings table created + seeded';
    RAISE NOTICE '   - Bookings realtime + reminder_text column added';
    RAISE NOTICE '   - FK relations fixed for PostgREST auto-joins';
END; $$;
