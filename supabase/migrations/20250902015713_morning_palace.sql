/*
  # Fix duplicate merchant records and add unique constraint

  1. Data Cleanup
    - Remove duplicate merchant records (keep the most recent one per profile_id)
    - Ensure each profile_id has only one merchant record
  
  2. Schema Updates
    - Add unique constraint on profile_id column
    - Prevent future duplicate merchant records
*/

-- Step 1: Identify and remove duplicate merchants
-- Keep only the most recent merchant record for each profile_id
WITH ranked_merchants AS (
  SELECT 
    id,
    profile_id,
    ROW_NUMBER() OVER (
      PARTITION BY profile_id 
      ORDER BY created_at DESC, updated_at DESC
    ) as rn
  FROM merchants
  WHERE profile_id IS NOT NULL
),
duplicates_to_delete AS (
  SELECT id 
  FROM ranked_merchants 
  WHERE rn > 1
)
DELETE FROM merchants 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE merchants 
ADD CONSTRAINT merchants_profile_id_unique 
UNIQUE (profile_id);

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_merchants_profile_id_unique 
ON merchants (profile_id) 
WHERE profile_id IS NOT NULL;

-- Verify the cleanup
SELECT 
  profile_id,
  COUNT(*) as merchant_count,
  STRING_AGG(business_name, ', ') as business_names
FROM merchants 
WHERE profile_id IS NOT NULL
GROUP BY profile_id
HAVING COUNT(*) > 1;

-- This query should return no rows if cleanup was successful