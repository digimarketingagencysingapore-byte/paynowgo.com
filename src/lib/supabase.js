// Always use PUBLIC schema (no Accept-Profile: paynowgo anywhere)
import { createClient } from '@supabase/supabase-js';

const env = (k) =>
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[k]) ??
  (typeof process !== 'undefined' && process.env && process.env[k]);

const SUPABASE_URL = env('VITE_SUPABASE_URL');
const SUPABASE_KEY = env('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY - using localStorage fallback');
}

// Tenant context (live)
let TENANT_ID = env('VITE_TENANT_ID') || '00000000-0000-0000-0000-000000000001';
export const DEFAULT_TENANT_ID = TENANT_ID;

export const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  db:   { schema: 'public' } // 🔒 fixed to public
}) : null;

export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase not configured. Please connect to Supabase first.');
  }
  return supabase;
};

export const isSupabaseConfigured = () => !!supabase;

export function setTenantContext(next) { if (typeof next === 'string' && next.trim()) TENANT_ID = next; }
export function getTenantContext() { return { tenantId: TENANT_ID }; }
export { TENANT_ID }; // live binding

export default supabase;