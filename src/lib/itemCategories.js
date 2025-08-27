import { supabase, TENANT_ID } from './supabase.js';
import { withSchemaRetry } from './util.js';

export async function upsertItemCategories(rows) {
  const payload = rows.map(x => ({
    item_id: x.item_id, category_id: x.category_id, tenant_id: TENANT_ID
  }));
  return withSchemaRetry(async () => {
    const { data, error } = await supabase
      .from('paynowgo.item_categories')
      .upsert(payload, { onConflict: 'item_id,category_id' });
    if (error) throw error; return data;
  });
}