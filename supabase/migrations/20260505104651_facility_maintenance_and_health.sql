-- Add maintenance_status to facilities
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS maintenance_status TEXT DEFAULT 'optimal';

-- Create maintenance_logs table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id),
    issue_title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'scheduled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can manage their facility logs"
ON public.maintenance_logs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.facilities f
        WHERE f.id = facility_id AND f.owner_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all maintenance logs"
ON public.maintenance_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Function to update facility status automatically when log is added (optional but good)
CREATE OR REPLACE FUNCTION public.update_facility_health()
RETURNS TRIGGER AS \$\$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF (NEW.status != 'resolved' AND NEW.severity IN ('high', 'critical')) THEN
            UPDATE public.facilities SET maintenance_status = 'maintenance' WHERE id = NEW.facility_id;
        ELSIF (NEW.status != 'resolved' AND NEW.severity = 'medium') THEN
            UPDATE public.facilities SET maintenance_status = 'degraded' WHERE id = NEW.facility_id;
        ELSE
            -- Check if there are other unresolved logs
            IF NOT EXISTS (SELECT 1 FROM public.maintenance_logs WHERE facility_id = NEW.facility_id AND status != 'resolved') THEN
                UPDATE public.facilities SET maintenance_status = 'optimal' WHERE id = NEW.facility_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_update_facility_health
AFTER INSERT OR UPDATE ON public.maintenance_logs
FOR EACH ROW EXECUTE FUNCTION public.update_facility_health();
