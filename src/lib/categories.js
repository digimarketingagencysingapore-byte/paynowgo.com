import { supabase, TENANT_ID } from './supabase.js';
import { withSchemaRetry, nowIso, uuid } from './util.js';

export async function upsertCategoriesById(categories) {
  const rows = categories.map(c => ({
    id: c.id ?? uuid(),
    tenant_id: TENANT_ID,
    name: c.name,
    parent_id: c.parent_id ?? null,
    sort_order: c.sort_order ?? 0,
    updated_at: c.updated_at ?? nowIso()
  }));
  return withSchemaRetry(async () => {
    const { data, error } = await supabase
      .from('paynowgo.categories')
      .upsert(rows) // PK=id
      .select();
    if (error) throw error; return data;
  });
}

export async function upsertCategoriesByNaturalKey(categories) {
  const rows = categories.map(c => ({
    id: c.id ?? uuid(),
    tenant_id: TENANT_ID,
    name: c.name,
    parent_id: c.parent_id ?? null,
    sort_order: c.sort_order ?? 0,
    updated_at: c.updated_at ?? nowIso()
  }));
  return withSchemaRetry(async () => {
    const { data, error } = await supabase
      .from('paynowgo.categories')
      .upsert(rows, { onConflict: 'tenant_id,name,parent_id' })
      .select();
    if (error) throw error; return data;
  });
}

export async function getAllCategories() {
  const { data, error } = await supabase
    .from('paynowgo.categories')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('sort_order', { ascending: true });
  if (error) throw error; return data;
}