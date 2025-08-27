import { supabase, TENANT_ID } from './supabase.js';
import { withSchemaRetry, nowIso, uuid } from './util.js';

/** Upsert by PRIMARY KEY id (recommended). No onConflict needed. */
export async function upsertItemsById(items) {
  const rows = items.map(it => ({
    id: it.id ?? uuid(),
    sku: it.sku ?? null,
    name: it.name,
    price_cents: it.price_cents,
    currency: it.currency ?? 'SGD',
    is_active: it.is_active ?? true,
    updated_at: it.updated_at ?? nowIso()
  }));
  return withSchemaRetry(async () => {
    const { data, error } = await supabase
      .from('paynowgo.items')
      .upsert(rows) // PK=id handles conflict
      .select();
    if (error) throw error; return data;
  });
}

/** Upsert by natural key (tenant_id, sku). Requires UNIQUE index created in migration. */
export async function upsertItemsBySku(items) {
  const rows = items.map(it => ({
    id: it.id ?? uuid(),
    sku: it.sku, // must not be null when using this route
    name: it.name,
    price_cents: it.price_cents,
    currency: it.currency ?? 'SGD',
    is_active: it.is_active ?? true,
    updated_at: it.updated_at ?? nowIso()
  }));
  return withSchemaRetry(async () => {
    const { data, error } = await supabase
      .from('paynowgo.items')
      .upsert(rows, { onConflict: 'tenant_id,sku' })
      .select();
    if (error) throw error; return data;
  });
}

export async function getAllItems() {
  const { data, error } = await supabase
    .from('paynowgo.items')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('name', { ascending: true });
  if (error) throw error; return data;
}