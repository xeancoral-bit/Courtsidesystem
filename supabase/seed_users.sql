-- Courtside User Seeder
-- This script creates sample users for testing across all three roles.
-- Note: Passwords are set to 'Password123' for all accounts.

DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
  owner1_id UUID := gen_random_uuid();
  owner2_id UUID := gen_random_uuid();
  user1_id UUID := gen_random_uuid();
  user2_id UUID := gen_random_uuid();
  user3_id UUID := gen_random_uuid();
BEGIN
  -- 1. Create Admin Account
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, audit_log_id)
  VALUES (admin_id, 'admin@courtside.app', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"System Administrator"}', now(), now(), 'authenticated', gen_random_uuid());

  -- 2. Create Facility Owners
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, audit_log_id)
  VALUES (owner1_id, 'owner.arena@courtside.app', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Marco Hoops"}', now(), now(), 'authenticated', gen_random_uuid());
  
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, audit_log_id)
  VALUES (owner2_id, 'owner.smash@courtside.app', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Sarah Smash"}', now(), now(), 'authenticated', gen_random_uuid());

  -- 3. Create Customers (Sports Users)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, audit_log_id)
  VALUES (user1_id, 'player.mike@gmail.com', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Mike Jordan"}', now(), now(), 'authenticated', gen_random_uuid());
  
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, audit_log_id)
  VALUES (user2_id, 'player.kobe@gmail.com', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Kobe Bean"}', now(), now(), 'authenticated', gen_random_uuid());
  
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, audit_log_id)
  VALUES (user3_id, 'player.lebron@gmail.com', crypt('Password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"King James"}', now(), now(), 'authenticated', gen_random_uuid());

  -- Update Roles (Triggers will have auto-created them as 'user', so we update the specifics)
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;
  UPDATE public.user_roles SET role = 'owner' WHERE user_id IN (owner1_id, owner2_id);
  
  -- Assign some sample facilities to the owners
  UPDATE public.facilities SET owner_id = owner1_id WHERE name ILIKE '%Basketball%';
  UPDATE public.facilities SET owner_id = owner2_id WHERE name ILIKE '%Badminton%';
  
  RAISE NOTICE 'Seeding complete. Users created with password: Password123';
END $$;
