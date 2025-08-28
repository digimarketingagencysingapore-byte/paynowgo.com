/**
 * Tenant Selection Service
 * Provides tenant options for items and orders based on current merchant context
 */

import { supabase } from './supabase';

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface TenantOption {
  id: string;
  name: string;
  source: 'tenant' | 'order'; // Where this option comes from
  orderCount?: number; // Number of orders if from orders table
}

/**
 * Get available tenants from the tenants table
 */
async function getTenants(): Promise<Tenant[]> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return (data || []).map((tenant: any) => ({
      id: tenant.id,
      name: tenant.name || `Tenant ${tenant.id}`,
      created_at: tenant.created_at
    }));
  } catch (error) {
    console.error('[TENANT_SERVICE] Failed to fetch tenants:', error);
    return [];
  }
}

/**
 * Get tenant options from orders that belong to current merchant
 * This provides a fallback when tenants table is not populated
 */
async function getTenantOptionsFromOrders(): Promise<TenantOption[]> {
  try {
    console.log('[TENANT_SERVICE] Getting tenant options from orders...');
    
    // Get current user's merchant ID first
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.warn('[TENANT_SERVICE] No authenticated user found');
      return [];
    }

    // Get merchant data
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, business_name')
      .eq('profile_id', user.id)
      .single();
      
    if (merchantError || !merchant) {
      console.warn('[TENANT_SERVICE] No merchant found for user');
      return [];
    }
    
    // Get unique tenant_ids from orders for this merchant
    // Note: We need to understand the relationship between merchants and tenant_ids
    // For now, we'll query orders and group by tenant_id
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('tenant_id')
      .eq('merchant_id', merchant.id) // Assuming orders have merchant_id
      .order('created_at', { ascending: false });
    
    if (orderError) {
      console.warn('[TENANT_SERVICE] Failed to fetch orders:', orderError);
      return [];
    }
    
    // Group by tenant_id and count orders
    const tenantMap = new Map<string, number>();
    
    (orderData || []).forEach((order: any) => {
      if (order.tenant_id) {
        tenantMap.set(order.tenant_id, (tenantMap.get(order.tenant_id) || 0) + 1);
      }
    });
    
    // Convert to options
    const options: TenantOption[] = Array.from(tenantMap.entries()).map(([tenantId, count]) => ({
      id: tenantId,
      name: `Orders Group ${tenantId.substring(0, 8)}...`,
      source: 'order' as const,
      orderCount: count
    }));
    
    console.log('[TENANT_SERVICE] Found tenant options from orders:', options.length);
    return options;
    
  } catch (error) {
    console.error('[TENANT_SERVICE] Failed to get tenant options from orders:', error);
    return [];
  }
}

/**
 * Get all available tenant options for the current merchant
 * Combines both tenant table and order-based options
 */
export async function getAvailableTenantOptions(): Promise<TenantOption[]> {
  console.log('[TENANT_SERVICE] Getting available tenant options...');
  
  // Try to get from tenants table first
  const tenants = await getTenants();
  const tenantOptions: TenantOption[] = tenants.map(tenant => ({
    id: tenant.id,
    name: tenant.name,
    source: 'tenant' as const
  }));
  
  // If we have tenants from the tenants table, prefer those
  if (tenantOptions.length > 0) {
    console.log('[TENANT_SERVICE] Using tenants from tenants table:', tenantOptions.length);
    return tenantOptions;
  }
  
  // Fallback to order-based tenant options
  const orderOptions = await getTenantOptionsFromOrders();
  console.log('[TENANT_SERVICE] Using tenant options from orders:', orderOptions.length);
  
  // If no options from either source, provide a default option
  if (orderOptions.length === 0) {
    return [{
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Tenant',
      source: 'tenant' as const
    }];
  }
  
  return orderOptions;
}

/**
 * Get the default tenant ID for new items
 * Uses the first available tenant or a fallback
 */
export async function getDefaultTenantId(): Promise<string> {
  const options = await getAvailableTenantOptions();
  
  if (options.length > 0) {
    return options[0].id;
  }
  
  // Fallback
  return '00000000-0000-0000-0000-000000000001';
}