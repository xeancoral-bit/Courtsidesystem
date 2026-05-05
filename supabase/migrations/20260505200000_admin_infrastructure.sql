-- Create audit_logs table for system monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Function to log actions (can be called from triggers or RPC)
CREATE OR REPLACE FUNCTION public.log_action(
    p_action TEXT,
    p_target_type TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
    VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings (e.g. site name), but only admins can edit
CREATE POLICY "Public settings viewable"
ON public.system_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can update settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Seed some default settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('site_config', '{"name": "Courtside", "email": "admin@courtside.ph", "maintenance": false}'::jsonb, 'General platform configuration'),
    ('security_policy', '{"max_login_attempts": 5, "require_mfa": false, "session_timeout": 3600}'::jsonb, 'Security and authentication rules'),
    ('branding', '{"primary_color": "#d4af37", "logo_url": null, "theme": "artisanal"}'::jsonb, 'Visual identity and theme overrides')
ON CONFLICT (key) DO NOTHING;
