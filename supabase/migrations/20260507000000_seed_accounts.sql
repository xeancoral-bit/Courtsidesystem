-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to safely create users with a specific role
CREATE OR REPLACE FUNCTION public.create_seed_user(
    p_email TEXT,
    p_password TEXT,
    p_role public.app_role,
    p_display_name TEXT
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Create user in auth.users
        INSERT INTO auth.users (
            instance_id, 
            id, 
            aud, 
            role, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            raw_app_meta_data, 
            raw_user_meta_data, 
            created_at, 
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            p_email,
            crypt(p_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('display_name', p_display_name),
            now(),
            now()
        )
        RETURNING id INTO v_user_id;

        -- The handle_new_user trigger will automatically create the profile and 'user' role
        -- We override the role here if it's not 'user'
        IF p_role != 'user' THEN
            UPDATE public.user_roles SET role = p_role WHERE user_id = v_user_id;
        END IF;
    ELSE
        -- If user exists, ensure they have the correct role
        UPDATE public.user_roles SET role = p_role WHERE user_id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed initial accounts
-- Password for all: Courtside2026!
SELECT public.create_seed_user('admin@courtside.ph', 'Courtside2026!', 'admin', 'System Administrator');
SELECT public.create_seed_user('owner@courtside.ph', 'Courtside2026!', 'owner', 'Facility Owner');
SELECT public.create_seed_user('player@courtside.ph', 'Courtside2026!', 'user', 'Pro Player');

-- Cleanup: Drop the helper function after seeding
DROP FUNCTION public.create_seed_user(TEXT, TEXT, public.app_role, TEXT);
