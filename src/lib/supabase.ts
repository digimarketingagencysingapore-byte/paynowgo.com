import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please connect to Supabase first.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

// Create authenticated Supabase client
export function getSupabaseClient(token?: string) {
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey
        }
      }
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        apikey: supabaseAnonKey
      }
    }
  });
}

// Database types
export interface DatabaseItem {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  price_cents: number;
  active: boolean;
  sku: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCategory {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseOrder {
  id: string;
  tenant_id: string;
  reference: string;
  amount: number;
  status: 'pending' | 'paid' | 'canceled' | 'expired';
  payload?: string;
  qr_svg?: string;
  expires_at?: string;
  created_at: string;
}

// Helper function to set tenant context
export async function setTenantContext(tenantId: string) {
  // Tenant context is handled by RLS policies in the database
  console.log('[SUPABASE] Using tenant context:', tenantId);
}

// Default tenant ID for demo
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Supabase schema is now fully enabled - no localStorage fallbacks
export const isSupabaseSchemaEnabled = true;