/*
  # Update merchant with PayNow data and link to admin profile

  1. Updates
    - Update existing merchants with test PayNow data
    - Link merchant to admin profile if it exists
  2. Inserts
    - Create demo merchant if none exist
    - Link to admin profile for proper authentication
*/

-- First, try to get the admin profile ID
DO $$
DECLARE
    admin_profile_id uuid;
    admin_user_id uuid;
BEGIN
    -- Try to find admin profile
    SELECT id INTO admin_profile_id 
    FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- If no admin profile exists, try to find any profile
    IF admin_profile_id IS NULL THEN
        SELECT id INTO admin_profile_id 
        FROM public.profiles 
        LIMIT 1;
    END IF;
    
    -- If still no profile, try to get from auth.users
    IF admin_profile_id IS NULL THEN
        SELECT id INTO admin_user_id 
        FROM auth.users 
        WHERE email = 'admin@mail.com' 
        LIMIT 1;
        
        -- Create profile if user exists but no profile
        IF admin_user_id IS NOT NULL THEN
            INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
            VALUES (admin_user_id, 'Admin User', 'admin', now(), now())
            ON CONFLICT (id) DO NOTHING;
            
            admin_profile_id := admin_user_id;
        END IF;
    END IF;
    
    -- Update existing merchants with PayNow data and link to profile
    UPDATE public.merchants 
    SET 
        uen = '201234567A',
        mobile = '+6591234567',
        profile_id = admin_profile_id,
        updated_at = now()
    WHERE id IS NOT NULL;
    
    -- If no merchants exist, create a demo merchant
    IF NOT EXISTS (SELECT 1 FROM public.merchants) THEN
        INSERT INTO public.merchants (
            id,
            business_name,
            email,
            password_hash,
            uen,
            mobile,
            address,
            status,
            profile_id,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'PayNow Demo Business',
            'admin@mail.com',
            '$2a$10$dummy.hash.for.demo.purposes.only',
            '201234567A',
            '+6591234567',
            '123 Demo Street, Singapore 123456',
            'active',
            admin_profile_id,
            now(),
            now()
        );
    END IF;
    
    RAISE NOTICE 'Merchant setup completed with profile_id: %', admin_profile_id;
END $$;

-- Verify the setup
SELECT 
    m.business_name,
    m.email,
    m.uen,
    m.mobile,
    m.status,
    m.profile_id,
    p.full_name as profile_name,
    p.role as profile_role
FROM public.merchants m
LEFT JOIN public.profiles p ON m.profile_id = p.id
ORDER BY m.created_at DESC
LIMIT 5;