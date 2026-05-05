DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending','paid','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_ref text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS series_id uuid;

DO $$
DECLARE
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'status' AND data_type = 'text') THEN
    
    FOR rec IN 
      SELECT con.conname 
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public' AND rel.relname = 'bookings' AND con.contype = 'c'
    LOOP
      EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I;', rec.conname);
    END LOOP;

    FOR rec IN 
      SELECT polname 
      FROM pg_policy 
      WHERE polrelid = 'public.bookings'::regclass
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings;', rec.polname);
    END LOOP;

    FOR rec IN 
      SELECT i.relname AS index_name
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE t.relname = 'bookings' AND t.relnamespace = 'public'::regnamespace AND a.attname = 'status'
    LOOP
      EXECUTE format('DROP INDEX IF EXISTS public.%I;', rec.index_name);
    END LOOP;

    EXECUTE 'DROP INDEX IF EXISTS public.idx_bookings_facility_paid_at;';
    EXECUTE 'ALTER TABLE public.bookings ALTER COLUMN status DROP DEFAULT;';
    EXECUTE 'ALTER TABLE public.bookings
      ALTER COLUMN status TYPE public.booking_status
      USING (CASE status::text
        WHEN ''pending'' THEN ''pending''::public.booking_status
        WHEN ''paid'' THEN ''paid''::public.booking_status
        WHEN ''cancelled'' THEN ''cancelled''::public.booking_status
        WHEN ''completed'' THEN ''completed''::public.booking_status
        WHEN ''confirmed'' THEN ''paid''::public.booking_status
        ELSE ''pending''::public.booking_status
      END);';
    EXECUTE 'ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT ''pending''::public.booking_status;';
    
    EXECUTE 'CREATE POLICY "Bookings visible to all for availability" ON public.bookings FOR SELECT USING (true);';
    EXECUTE 'CREATE POLICY "Users create their own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);';
    EXECUTE 'CREATE POLICY "Users can cancel own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);';
    EXECUTE 'CREATE POLICY "Users can delete own bookings" ON public.bookings FOR DELETE TO authenticated USING (auth.uid() = user_id);';
  END IF;
END $$;

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
CREATE POLICY "Series visible to owner" ON public.booking_series FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create their own series" ON public.booking_series;
CREATE POLICY "Users create their own series" ON public.booking_series FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own series" ON public.booking_series;
CREATE POLICY "Users delete own series" ON public.booking_series FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can grant roles" ON public.user_roles;
CREATE POLICY "Admins can grant roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;
CREATE POLICY "Admins can revoke roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.facilities (name, sport_type, location, description, hourly_price, open_hour, close_hour, image_url)
SELECT * FROM (VALUES
  ('Butuan City Sports Complex - Basketball Court', 'basketball', 'J.C. Aquino Ave, Butuan City', 'Full-size FIBA-grade basketball court in the heart of the city.', 350::numeric, 7, 22, 'basketball'),
  ('Father Saturnino Urios University Gymnasium', 'basketball', 'San Francisco St, Butuan City', 'Covered university gym available for community bookings.', 500::numeric, 8, 21, 'basketball'),
  ('Agusan Pavilion Badminton Hall', 'badminton', 'Montilla Blvd, Butuan City', '6 BWF-standard badminton courts with wooden flooring.', 250::numeric, 6, 23, 'badminton'),
  ('Caraga Sports Hub - Indoor Soccer', 'soccer', 'Libertad, Butuan City', '5-a-side indoor turf perfect for futsal and team practice.', 800::numeric, 9, 22, 'soccer'),
  ('Power Up Fitness Butuan', 'gym', 'Villa Kananga, Butuan City', 'Fully equipped gym with cardio, free weights and trainers.', 150::numeric, 5, 22, 'gym'),
  ('Guingona Park Tennis Courts', 'tennis', 'Guingona Park, Butuan City', 'Two outdoor hard courts open to the public.', 200::numeric, 6, 20, 'tennis')
) AS v(name, sport_type, location, description, hourly_price, open_hour, close_hour, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.facilities);