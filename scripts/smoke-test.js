import 'dotenv/config';
import '../src/lib/supabase.js';
import { supabase, TENANT_ID } from '../src/lib/supabase.js';
import { upsertCategoriesById, upsertCategoriesByNaturalKey, getAllCategories } from '../src/lib/categories.js';
import { upsertItemsById, upsertItemsBySku, getAllItems } from '../src/lib/items.js';
import { upsertItemCategories } from '../src/lib/itemCategories.js';

async function ensureTenant() {
  const { data, error } = await supabase.from('paynowgo.tenants').select('id').eq('id', TENANT_ID).maybeSingle?.();
  if (error) throw error;
  if (!data) {
    const { error: e2 } = await supabase.from('paynowgo.tenants').insert({ id: TENANT_ID, name: 'Demo Tenant' });
    if (e2) throw e2;
  }
}

(async () => {
  await ensureTenant();

  // Categories by PK
  await upsertCategoriesById([{ name: 'Beverages' }, { name: 'Snacks' }]);
  // Categories by natural key (exercise UNIQUE (tenant_id,name,parent_id))
  await upsertCategoriesByNaturalKey([{ name: 'Beverages' }]);

  // Items by PK
  await upsertItemsById([{ name: 'Cola 330ml', price_cents: 250, sku: 'COLA-330' }]);
  // Items by SKU (exercise UNIQUE (tenant_id,sku))
  await upsertItemsBySku([{ name: 'Cola 330ml', price_cents: 300, sku: 'COLA-330' }]);

  const cats = await getAllCategories();
  const items = await getAllItems();

  const cola = items.find(i => i.sku === 'COLA-330');
  const bev = cats.find(c => c.name === 'Beverages');

  if (cola && bev) {
    await upsertItemCategories([{ item_id: cola.id, category_id: bev.id }]); // onConflict item_id,category_id
  }

  console.log('Smoke test OK. Items:', items.length, 'Categories:', cats.length);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });