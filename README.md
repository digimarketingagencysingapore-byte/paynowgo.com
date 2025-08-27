# PayNowGo – Robust Public Views Setup (always public)

This project pins the app to **public** schema with robust handling of all PostgreSQL object types. We expose updatable **views** in `public` that select from `paynowgo.*`. The client is always created with `db: { schema: 'public' }`.

## Steps

1. **(Optional) Diagnose current object types**:
   - Run `sql/diagnose_object_types.sql` to see what types your objects currently are
   - This helps understand if you have tables, partitioned tables, foreign tables, etc.

2. **Create public views** (idempotent, handles ALL object types):
   - Run `sql/00000000000000_public_views_fix.sql` or `sql/fix_all_public_views.sql`
   - Automatically migrates data from existing public tables
   - Handles all PostgreSQL object types:
     - `r` = ordinary table → renamed to backup
     - `p` = partitioned table → renamed to backup  
     - `f` = foreign table → renamed to backup
     - `v` = view → dropped and recreated
     - `m` = materialized view → renamed to backup
     - `S` = sequence → renamed to backup
     - `i` = index → renamed to backup
   - Creates clean views:
     - `public.items` → `paynowgo.items`
     - `public.categories` → `paynowgo.categories`
     - `public.order_items` → `paynowgo.order_items`
   - Sets proper grants + `NOTIFY pgrst, 'reload schema'`

3. **Configure client**:
   - Set `.env` variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TENANT_ID`.
   - Use `/src/lib/supabase.js` from this repo (schema fixed to `public`).
   - **Do not** send `Accept-Profile: paynowgo` headers anywhere (manual fetches should use default or `Accept-Profile: public`).

## Usage

```javascript
import { supabase, TENANT_ID } from './src/lib/supabase.js';

// All operations go through public views → paynowgo tables (no config needed)
const { data } = await supabase.from('items').select('*').eq('tenant_id', TENANT_ID);
const { data: newItem } = await supabase.from('items').insert({ name: 'Coffee', tenant_id: TENANT_ID }).select();
```

## Quick Test

```javascript
// Browser DevTools
import { supabase } from '/src/lib/supabase.js';
const { data, error } = await supabase.from('items').select('id').limit(1);
console.log(error ?? 'OK');  // should work without PGRST106/42809
```

## Notes

- **No Supabase configuration** needed - works out of the box with standard public schema.
- **RLS** on base tables in `paynowgo` still applies. Ensure your policies permit the required operations.
- **Automatic backups** - Old objects are renamed with timestamps before creating views.
- **Robust object handling** - Works regardless of current object type (table, partition, foreign table, etc.)

## Troubleshooting

### Error: `42809: "order_items" is not a view`
- **Fixed!** Run `sql/00000000000000_public_views_fix.sql`
- The migration handles all types: tables (r), partitioned tables (p), foreign tables (f), views (v), materialized views (m), sequences (S), indexes (i)
- Use `sql/diagnose_object_types.sql` to see current object types

### Error: `paynowgo.items not found`
- Ensure the `paynowgo` schema and tables exist in your Supabase project.
- The migration requires existing `paynowgo.items`, `paynowgo.categories`, `paynowgo.order_items` tables.

### Error: `PGRST106` (schema not found)
- Client is correctly configured for `public` schema.
- Ensure views exist by running the migration.
- Wait 30 seconds after migration for PostgREST cache reload.

### Error: `PGRST205` (schema cache)
- Views should auto-refresh with `NOTIFY pgrst, 'reload schema'`.
- Wait 30 seconds and retry if needed.
- The `ensureTablesReady()` function handles this automatically.

### Error: Permission denied
- Check RLS policies on `paynowgo.*` tables.
- Verify grants: `\dp paynowgo.items` in psql.

### Object Type Reference
- `r` = ordinary table
- `p` = partitioned table  
- `f` = foreign table
- `v` = view
- `m` = materialized view
- `S` = sequence
- `i` = index

## Architecture

```
Client (public schema) → public.items (view)       → paynowgo.items (table + RLS)
                      → public.categories (view)    → paynowgo.categories (table + RLS)  
                      → public.order_items (view)   → paynowgo.order_items (table + RLS)
```

This approach:
- ✅ Requires **no Supabase dashboard changes**
- ✅ Uses standard **public** schema
- ✅ Provides **updatable views** for full CRUD
- ✅ Maintains **tenant isolation** via RLS
- ✅ Handles **all PostgreSQL object types** robustly
- ✅ **Automatic data migration** from existing public tables