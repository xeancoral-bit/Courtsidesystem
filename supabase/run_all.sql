-- ============================================================
-- CourtConnect — Full Migration + Seed (run once on fresh DB)
-- Project: bqqyxlvyvtwvfgrnbmlc
-- ============================================================

-- ── Migration 1: Base schema ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  hourly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  open_hour INT NOT NULL DEFAULT 8,
  close_hour INT NOT NULL DEFAULT 22,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Facilities are public" ON public.facilities;
CREATE POLICY "Facilities are public" ON public.facilities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owners can insert facilities" ON public.facilities;
CREATE POLICY "Owners can insert facilities" ON public.facilities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can update their facilities" ON public.facilities;
CREATE POLICY "Owners can update their facilities" ON public.facilities
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can delete their facilities" ON public.facilities;
CREATE POLICY "Owners can delete their facilities" ON public.facilities
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_hour INT NOT NULL,
  end_hour INT NOT NULL,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookings visible to all for availability" ON public.bookings;
CREATE POLICY "Bookings visible to all for availability" ON public.bookings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create their own bookings" ON public.bookings;
CREATE POLICY "Users create their own bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can cancel own bookings" ON public.bookings;
CREATE POLICY "Users can cancel own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;
CREATE POLICY "Users can delete own bookings" ON public.bookings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS facilities_updated ON public.facilities;
CREATE TRIGGER facilities_updated BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Migration 2: Revoke public execute on functions ──────────
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- ── Migration 3: booking_status enum + extra columns ─────────
DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending','paid','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS series_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS owner_notes text;

-- ── Migration 4: reminder_preferences ───────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  minutes_before INTEGER NOT NULL CHECK (minutes_before > 0 AND minutes_before <= 10080),
  label TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, minutes_before)
);
ALTER TABLE public.reminder_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own reminders" ON public.reminder_preferences;
CREATE POLICY "Users view own reminders" ON public.reminder_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own reminders" ON public.reminder_preferences;
CREATE POLICY "Users insert own reminders" ON public.reminder_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own reminders" ON public.reminder_preferences;
CREATE POLICY "Users update own reminders" ON public.reminder_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own reminders" ON public.reminder_preferences;
CREATE POLICY "Users delete own reminders" ON public.reminder_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_reminder_preferences_updated_at ON public.reminder_preferences;
CREATE TRIGGER update_reminder_preferences_updated_at
  BEFORE UPDATE ON public.reminder_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Migration 5: profiles reminder columns ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (reminder_channel IN ('in_app','email')),
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT true;

-- ── Migration 6: booking_series ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  team_name text NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_hour int NOT NULL,
  end_hour int NOT NULL,
  weeks int NOT NULL CHECK (weeks BETWEEN 1 AND 52),
  start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Series visible to owner" ON public.booking_series;
CREATE POLICY "Series visible to owner" ON public.booking_series
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create their own series" ON public.booking_series;
CREATE POLICY "Users create their own series" ON public.booking_series
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own series" ON public.booking_series;
CREATE POLICY "Users delete own series" ON public.booking_series
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── Migration 7: Admin policies ──────────────────────────────
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can grant roles" ON public.user_roles;
CREATE POLICY "Admins can grant roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;
CREATE POLICY "Admins can revoke roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Admins can view all user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owners can update notes on their facility bookings" ON public.bookings;
CREATE POLICY "Owners can update notes on their facility bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.facilities f WHERE f.id = bookings.facility_id AND f.owner_id = auth.uid()));

-- ── Migration 8: Admin audit log + secure functions ──────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('grant','revoke','password_reset')),
  role public.app_role,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log (target_user_id);

CREATE OR REPLACE FUNCTION public.admin_grant_role(_target_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_role(_caller, 'admin') THEN RAISE EXCEPTION 'Only admins can grant roles' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role) ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, role) VALUES (_caller, _target_user_id, 'grant', _role);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(_target_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid(); _admin_count int;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_role(_caller, 'admin') THEN RAISE EXCEPTION 'Only admins can revoke roles' USING ERRCODE = '42501'; END IF;
  IF _role = 'admin' THEN
    SELECT COUNT(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin';
    IF _admin_count <= 1 THEN RAISE EXCEPTION 'Cannot revoke the last remaining admin' USING ERRCODE = '23514'; END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action, role) VALUES (_caller, _target_user_id, 'revoke', _role);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_log_password_reset(_target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can trigger password resets' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, target_user_id, action) VALUES (_caller, _target_user_id, 'password_reset');
END; $$;

REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_log_password_reset(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_password_reset(uuid) TO authenticated;

-- ── Migration 9: Reviews ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
CREATE POLICY "Users can insert their own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Seed: Sample facilities ───────────────────────────────────
INSERT INTO public.facilities (name, sport_type, location, description, image_url, hourly_price, open_hour, close_hour)
SELECT * FROM (VALUES
  ('Downtown Hoops Arena', 'Basketball', 'Downtown · Main St 12', 'Premium indoor basketball court with hardwood flooring and professional lighting.', '/src/assets/basketball.jpg', 25, 8, 22),
  ('Smash Badminton Center', 'Badminton', 'Eastside · Park Ave 34', 'Six wooden badminton courts with proper net height and bright LED lighting.', '/src/assets/badminton.jpg', 15, 7, 23),
  ('Iron Forge Gym', 'Gym', 'Westside · Oak Rd 88', 'Fully equipped strength gym with free weights, racks, and cardio zone.', '/src/assets/gym.jpg', 12, 6, 23),
  ('Greenfield Soccer Pitch', 'Soccer', 'Northside · Stadium Way 1', 'Full-size turf pitch with stadium lighting for evening matches.', '/src/assets/soccer.jpg', 60, 9, 23),
  ('Centre Court Tennis Club', 'Tennis', 'Riverside · Lake Dr 7', 'Indoor hard court tennis with climate control year-round.', '/src/assets/tennis.jpg', 30, 8, 22),
  ('Skyline Rooftop Court', 'Basketball', 'Uptown · Tower Plaza', 'Outdoor rooftop basketball court with city skyline views.', '/src/assets/hero.jpg', 20, 10, 22),
  ('Butuan City Sports Complex - Basketball Court', 'basketball', 'J.C. Aquino Ave, Butuan City', 'Full-size FIBA-grade basketball court in the heart of the city.', 'basketball', 350, 7, 22),
  ('Agusan Pavilion Badminton Hall', 'badminton', 'Montilla Blvd, Butuan City', '6 BWF-standard badminton courts with wooden flooring.', 'badminton', 250, 6, 23),
  ('Caraga Sports Hub - Indoor Soccer', 'soccer', 'Libertad, Butuan City', '5-a-side indoor turf perfect for futsal and team practice.', 'soccer', 800, 9, 22),
  ('Power Up Fitness Butuan', 'gym', 'Villa Kananga, Butuan City', 'Fully equipped gym with cardio, free weights and trainers.', 'gym', 150, 5, 22),
  ('Guingona Park Tennis Courts', 'tennis', 'Guingona Park, Butuan City', 'Two outdoor hard courts open to the public.', 'tennis', 200, 6, 20)
) AS v(name, sport_type, location, description, image_url, hourly_price, open_hour, close_hour)
WHERE NOT EXISTS (SELECT 1 FROM public.facilities LIMIT 1);

-- ── Seed: Test users (password = Password123) ────────────────
DO $$
DECLARE
  admin_id  UUID;
  owner1_id UUID;
  user1_id  UUID;
  user2_id  UUID;
BEGIN
  -- Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@courtside.app') THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
    VALUES (admin_id, 'admin@courtside.app', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"System Administrator"}', now(), now(), 'authenticated');
  END IF;

  -- Owner
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner.arena@courtside.app') THEN
    owner1_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
    VALUES (owner1_id, 'owner.arena@courtside.app', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Marco Hoops"}', now(), now(), 'authenticated');
  END IF;

  -- Player 1
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'player.mike@gmail.com') THEN
    user1_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
    VALUES (user1_id, 'player.mike@gmail.com', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Mike Jordan"}', now(), now(), 'authenticated');
  END IF;

  -- Player 2
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'player.kobe@gmail.com') THEN
    user2_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
    VALUES (user2_id, 'player.kobe@gmail.com', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Kobe Bean"}', now(), now(), 'authenticated');
  END IF;

  -- Promote admin role
  UPDATE public.user_roles SET role = 'admin'
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@courtside.app');

  -- Promote owner role
  UPDATE public.user_roles SET role = 'owner'
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'owner.arena@courtside.app');

  RAISE NOTICE 'Setup complete. Login: admin@courtside.app / Password123';
END $$;

