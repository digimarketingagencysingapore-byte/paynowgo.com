-- Check what type of objects the public tables are
SELECT 
  table_name,
  table_schema,
  table_type
FROM information_schema.tables 
WHERE table_schema IN ('public', 'paynowgo') 
AND table_name IN ('items', 'categories', 'orders', 'payments')
ORDER BY table_schema, table_name;