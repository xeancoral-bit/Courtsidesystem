-- Enable Realtime for bookings table
-- This allows the calendar to update instantly when a booking is confirmed or created.

-- Add the bookings table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Ensure the table has replication enabled (usually default for public tables, but good to be explicit)
ALTER TABLE bookings REPLICA IDENTITY FULL;
