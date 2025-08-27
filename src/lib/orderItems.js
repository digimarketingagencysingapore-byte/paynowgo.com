import { supabase, TENANT_ID } from './supabase.js';
import { withSchemaRetry } from './util.js';

export async function upsertOrderItems(lines) {
  const rows = lines.map(l => ({
    order_id: l.order_id,
    line_no: l.line_no,
    item_id: l.item_id,
    name: l.name,
    qty: l.qty,
    unit_price_cents: l.unit_price_cents,
    currency: l.currency ?? 'SGD',
    tenant_id: TENANT_ID
  }));
  return withSchemaRetry(async () => {
    const { data, error } = await supabase
      .from('paynowgo.order_items')
      .upsert(rows, { onConflict: 'order_id,line_no' });
    if (error) throw error; return data;
  });
}