import { supabase, TENANT_ID } from './supabase.js';
import { withSchemaRetry, uuid } from './util.js';

export async function createPayment({ order_id, method, amount_cents, currency = 'SGD', reference }) {
  const row = {
    id: uuid(), tenant_id: TENANT_ID, order_id, method,
    amount_cents, currency, status: 'succeeded', reference: reference ?? null
  };
  return withSchemaRetry(async () => {
    const { data, error } = await supabase.from('paynowgo.payments').insert(row).select();
    if (error) throw error; return data?.[0];
  });
}