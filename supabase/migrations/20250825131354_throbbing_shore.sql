-- Run BEFORE fix_public_views.sql if you previously had real tables in public and want to keep their rows.
-- Adjust columns if needed.

INSERT INTO paynowgo.items (id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at)
SELECT id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at
FROM public.items
ON CONFLICT (id) DO NOTHING;

INSERT INTO paynowgo.categories (id, tenant_id, name, parent_id, sort_order, created_at, updated_at)
SELECT id, tenant_id, name, parent_id, sort_order, created_at, updated_at
FROM public.categories
ON CONFLICT (id) DO NOTHING;

INSERT INTO paynowgo.order_items (order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id)
SELECT order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id
FROM public.order_items
ON CONFLICT (order_id, line_no) DO NOTHING;