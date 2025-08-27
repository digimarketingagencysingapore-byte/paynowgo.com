-- Inspect constraints/indexes to verify onConflict targets exist
select conname, contype, pg_get_constraintdef(c.oid) as def
from pg_constraint c
where c.conrelid in (
  'paynowgo.items'::regclass,
  'paynowgo.categories'::regclass,
  'paynowgo.item_categories'::regclass,
  'paynowgo.order_items'::regclass,
  'paynowgo.orders'::regclass,
  'paynowgo.payments'::regclass
)
order by 1;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'paynowgo'
order by 2,3;