import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { 
    persistSession: false,
    autoRefreshToken: false
  }
});

// Helper to set tenant context for RLS
export async function setTenantContext(tenantId: string) {
  try {
    const { error } = await supabaseAdmin.rpc('set_config', {
      parameter: 'app.current_tenant_id',
      value: tenantId
    });
    
    if (error) {
      console.warn('Could not set tenant context:', error);
    }
  } catch (error) {
    console.warn('RPC set_config not available:', error);
  }
}