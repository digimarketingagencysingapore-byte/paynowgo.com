-- Update merchant with test PayNow data
-- This script adds valid test PayNow values to enable QR generation

-- Update any existing merchant with test PayNow data
UPDATE public.merchants 
SET 
  uen = '201234567A',
  mobile = '+6591234567',
  updated_at = now()
WHERE id IS NOT NULL;

-- If no merchants exist, create a test merchant
INSERT INTO public.merchants (
  id,
  business_name,
  email,
  password_hash,
  uen,
  mobile,
  address,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'PayNow Demo Business',
  'demo@paynowgo.com',
  '$2a$10$dummy.hash.for.demo.purposes.only',
  '201234567A',
  '+6591234567',
  '123 Demo Street, Singapore 123456',
  'active',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.merchants);

-- Verify the update
SELECT 
  business_name,
  email,
  uen,
  mobile,
  status
FROM public.merchants
ORDER BY created_at DESC
LIMIT 5;