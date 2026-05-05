-- Owner Administrative Features: Staff, Reviews, Support, and Seed Data

-- 1. Staff Management Table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies for Staff
CREATE POLICY "Owners can manage staff for their facilities"
ON public.staff FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.facilities f
        WHERE f.id = staff.facility_id
        AND f.owner_id = auth.uid()
    )
);

-- Policies for Reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT TO public
USING (true);

CREATE POLICY "Users can insert their own reviews"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policies for Support Tickets
CREATE POLICY "Users can manage their own support tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 5. Seed Data for Owner (owner@courtside.ph)
DO $$
DECLARE
    v_owner_id UUID;
    v_player_id UUID;
    v_facility_id UUID;
BEGIN
    -- Get IDs
    SELECT id INTO v_owner_id FROM auth.users WHERE email = 'owner@courtside.ph' LIMIT 1;
    SELECT id INTO v_player_id FROM auth.users WHERE email = 'player@courtside.ph' LIMIT 1;

    IF v_owner_id IS NOT NULL THEN
        -- Seed Facilities
        INSERT INTO public.facilities (name, sport_type, location, description, hourly_price, open_hour, close_hour, owner_id)
        VALUES 
            ('Grand Court Butuan', 'basketball', 'Libertad, Butuan City', 'Premier indoor basketball court with wooden flooring and professional lighting.', 350, 6, 23, v_owner_id),
            ('Smash Point Badminton', 'badminton', 'Montalban, Butuan City', 'Dedicated badminton facility with 4 international standard courts.', 200, 8, 22, v_owner_id),
            ('Aura Fitness Gym', 'gym', 'Villa Kananga, Butuan City', 'Full-service fitness gym with modern equipment and personal trainers.', 150, 5, 21, v_owner_id)
        ON CONFLICT DO NOTHING;

        -- Get one facility ID for further seeding
        SELECT id INTO v_facility_id FROM public.facilities WHERE owner_id = v_owner_id LIMIT 1;

        -- Seed Staff
        IF v_facility_id IS NOT NULL THEN
            INSERT INTO public.staff (facility_id, name, role, email, phone)
            VALUES 
                (v_facility_id, 'Juan Dela Cruz', 'Court Manager', 'juan@example.com', '09123456789'),
                (v_facility_id, 'Maria Clara', 'Booking Coordinator', 'maria@example.com', '09987654321')
            ON CONFLICT DO NOTHING;
            
            -- Seed Reviews
            IF v_player_id IS NOT NULL THEN
                INSERT INTO public.reviews (facility_id, user_id, rating, comment)
                VALUES 
                    (v_facility_id, v_player_id, 5, 'Great court! Very clean and the staff are friendly.'),
                    (v_facility_id, v_player_id, 4, 'Good place to play, but a bit hot in the afternoon.')
                ON CONFLICT DO NOTHING;
                
                -- Seed Bookings
                INSERT INTO public.bookings (facility_id, user_id, booking_date, start_hour, end_hour, total_price, status)
                VALUES 
                    (v_facility_id, v_player_id, CURRENT_DATE::text, 14, 16, 700, 'paid'),
                    (v_facility_id, v_player_id, (CURRENT_DATE + interval '1 day')::date::text, 10, 12, 700, 'pending'),
                    (v_facility_id, v_player_id, (CURRENT_DATE - interval '2 days')::date::text, 18, 20, 700, 'completed')
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;

        -- Seed Support Ticket
        INSERT INTO public.support_tickets (user_id, subject, message, status)
        VALUES (v_owner_id, 'Payment issue', 'I am not seeing my latest payout in the system.', 'open')
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;
