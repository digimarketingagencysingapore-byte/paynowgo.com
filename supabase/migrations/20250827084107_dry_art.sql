-- Step 1: Check what tables exist in your database
-- Run this in Supabase SQL Editor to see what we're working with

SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema IN ('public', 'paynowgo') 
AND table_name IN ('items', 'categories', 'orders', 'payments', 'order_items')
ORDER BY table_schema, table_name;