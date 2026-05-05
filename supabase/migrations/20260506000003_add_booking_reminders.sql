-- Add reminder capability to bookings
-- Allows owners to set specific instructions or reminders for each booking.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS reminder_text TEXT;

-- Update RLS: Owners should be able to update bookings for their facilities
-- First, let's ensure we have a clean policy for owners.
DROP POLICY IF EXISTS "Owners can manage bookings for their facilities" ON public.bookings;
CREATE POLICY "Owners can manage bookings for their facilities" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = bookings.facility_id
      AND f.owner_id = auth.uid()
    )
  );

-- Admins can update any booking
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
CREATE POLICY "Admins can update all bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
