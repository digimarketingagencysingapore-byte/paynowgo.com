import { supabase, TENANT_ID } from './supabase.js';
import { withSchemaRetry, nowIso, uuid } from './util.js';

export async function createOrder({ device_id, customer_id, currency = 'SGD' }) {
  const orderId = uuid();
  const row = {
    id: orderId, tenant_id: TENANT_ID,
    device_id: device_id ?? null,
    customer_id: customer_id ?? null,
    status: 'pending', total_cents: 0, currency, updated_at: nowIso()
  };
  await withSchemaRetry(async () => {
    const { error } = await supabase.from('paynowgo.orders').insert(row);
    if (error) throw error;
  });
  return orderId;
}

export async function setOrderTotal(order_id, total_cents) {
  return withSchemaRetry(async () => {
    const { error } = await supabase
      .from('paynowgo.orders')
      .update({ total_cents, updated_at: nowIso() })
      .eq('id', order_id).eq('tenant_id', TENANT_ID);
    if (error) throw error;
  });
}

export async function markPaid(order_id) {
  return withSchemaRetry(async () => {
    const { error } = await supabase
      .from('paynowgo.orders')
      .update({ status: 'paid', updated_at: nowIso() })
      .eq('id', order_id).eq('tenant_id', TENANT_ID);
    if (error) throw error;
  });
}