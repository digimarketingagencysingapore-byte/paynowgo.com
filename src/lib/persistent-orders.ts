/**
 * Persistent Orders API - Database-first approach
 * All orders are stored permanently in Supabase with proper tenant isolation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PersistentOrder {
  id: string;
  reference: string;
  amount: number;
  status: 'pending' | 'paid' | 'canceled' | 'expired';
  createdAt: string;
  paidAt?: string;
  canceledAt?: string;
  expiresAt?: string;
  terminal?: {
    id: string;
    name: string;
    deviceKey: string;
    location?: string;
  };
  items: OrderLineItem[];
  payments: OrderPayment[];
  qrSvg?: string;
  qrText?: string;
  meta?: Record<string, any>;
}

export interface OrderLineItem {
  id: string;
  itemId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
  };
}

export interface OrderPayment {
  id: string;
  source: 'manual' | 'email' | 'push' | 'automation';
  amount: number;
  payerName?: string;
  bankRef?: string;
  receivedAt: string;
  raw?: Record<string, any>;
}

export interface CreateOrderRequest {
  terminalId?: string;
  amount: number;
  reference?: string;
  items?: Array<{
    itemId?: string;
    name: string;
    unitPriceCents: number;
    qty: number;
  }>;
  idempotencyKey?: string;
  qrSvg?: string;
  qrText?: string;
}

export interface OrdersQuery {
  cursor?: string;
  limit?: number;
  status?: 'pending' | 'paid' | 'canceled' | 'expired';
  from?: string;
  to?: string;
  terminalId?: string;
}

export interface OrdersResponse {
  orders: PersistentOrder[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

// Get current tenant ID from user session
function getCurrentTenantId(): string {
  if (typeof window !== 'undefined') {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const merchant = JSON.parse(userData);
        return merchant.id;
      }
    } catch (error) {
      console.error('Error getting tenant ID:', error);
    }
  }
  return '00000000-0000-0000-0000-000000000001';
}

// Set tenant context for RLS
async function setTenantContext(tenantId: string) {
  try {
    await supabase.rpc('set_config', {
      parameter: 'app.current_tenant_id',
      value: tenantId
    });
  } catch (error) {
    console.warn('Could not set tenant context:', error);
  }
}

export const PersistentOrdersAPI = {
  /**
   * Create a new order with items
   */
  async createOrder(data: CreateOrderRequest): Promise<PersistentOrder> {
    try {
      console.log('[PERSISTENT_ORDERS] Creating order:', data);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const result = await response.json();
      console.log('[PERSISTENT_ORDERS] Order created:', result.orderId);

      // Fetch the complete order details
      return await this.getOrder(result.orderId);
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] Create order failed:', error);
      throw error;
    }
  },

  /**
   * Get order details by ID
   */
  async getOrder(orderId: string): Promise<PersistentOrder> {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch order');
      }

      return await response.json();
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] Get order failed:', error);
      throw error;
    }
  },

  /**
   * List orders with pagination and filtering
   */
  async listOrders(query: OrdersQuery = {}): Promise<OrdersResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (query.cursor) searchParams.set('cursor', query.cursor);
      if (query.limit) searchParams.set('limit', query.limit.toString());
      if (query.status) searchParams.set('status', query.status);
      if (query.from) searchParams.set('from', query.from);
      if (query.to) searchParams.set('to', query.to);
      if (query.terminalId) searchParams.set('terminalId', query.terminalId);

      const response = await fetch(`/api/orders?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      return await response.json();
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] List orders failed:', error);
      throw error;
    }
  },

  /**
   * Mark order as paid
   */
  async markOrderPaid(orderId: string, data?: {
    payerName?: string;
    bankRef?: string;
    note?: string;
  }): Promise<void> {
    try {
      const response = await fetch(`/api/orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify(data || {})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark order as paid');
      }

      console.log('[PERSISTENT_ORDERS] Order marked as paid:', orderId);
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] Mark paid failed:', error);
      throw error;
    }
  },

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel order');
      }

      console.log('[PERSISTENT_ORDERS] Order canceled:', orderId);
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] Cancel order failed:', error);
      throw error;
    }
  },

  /**
   * Get display snapshot for device
   */
  async getDisplaySnapshot(deviceKey: string): Promise<{
    state: 'idle' | 'show';
    payload?: {
      orderId: string;
      amount: number;
      reference: string;
      qrSvg?: string;
      qrText?: string;
      expiresAt?: string;
    };
    terminal: {
      id: string;
      name: string;
    };
  }> {
    try {
      const response = await fetch(`/api/displays/snapshot?k=${deviceKey}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get display snapshot');
      }

      return await response.json();
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] Get display snapshot failed:', error);
      throw error;
    }
  },

  /**
   * Get order statistics
   */
  async getOrderStats(query: {
    from?: string;
    to?: string;
    terminalId?: string;
  } = {}): Promise<{
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    canceledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    try {
      const tenantId = getCurrentTenantId();
      await setTenantContext(tenantId);

      let supabaseQuery = supabase
        .from('orders')
        .select('status, amount_cents')
        .eq('tenant_id', tenantId);

      if (query.from) {
        supabaseQuery = supabaseQuery.gte('created_at', query.from);
      }

      if (query.to) {
        supabaseQuery = supabaseQuery.lte('created_at', query.to);
      }

      if (query.terminalId) {
        supabaseQuery = supabaseQuery.eq('terminal_id', query.terminalId);
      }

      const { data: orders, error } = await supabaseQuery;

      if (error) {
        throw new Error(error.message);
      }

      const stats = {
        totalOrders: orders?.length || 0,
        paidOrders: orders?.filter(o => o.status === 'paid').length || 0,
        pendingOrders: orders?.filter(o => o.status === 'pending').length || 0,
        canceledOrders: orders?.filter(o => o.status === 'canceled').length || 0,
        totalRevenue: 0,
        averageOrderValue: 0
      };

      const paidOrdersData = orders?.filter(o => o.status === 'paid') || [];
      stats.totalRevenue = paidOrdersData.reduce((sum, o) => sum + o.amount_cents, 0) / 100;
      stats.averageOrderValue = paidOrdersData.length > 0 ? stats.totalRevenue / paidOrdersData.length : 0;

      return stats;
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] Get stats failed:', error);
      throw error;
    }
  }
};

// Export types for use in components
export type {
  PersistentOrder,
  OrderLineItem,
  OrderPayment,
  CreateOrderRequest,
  OrdersQuery,
  OrdersResponse
};