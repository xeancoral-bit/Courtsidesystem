-- Add foreign key from bookings(user_id) to profiles(id) to enable auto-joins in Supabase
-- This is necessary because although both reference auth.users, Postgrest needs a direct link for joining.
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_user_id_fkey,
ADD CONSTRAINT bookings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Also check facilities and profiles
ALTER TABLE public.facilities
DROP CONSTRAINT IF EXISTS facilities_owner_id_fkey,
ADD CONSTRAINT facilities_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;
