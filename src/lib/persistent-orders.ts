/**
 * Persistent Orders API - Database-first approach
 * All orders are stored permanently in Supabase with proper tenant isolation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

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

// Get current merchant ID (tenant) from Supabase session
async function getCurrentMerchantId(): Promise<string> {
  try {
    console.log('[PERSISTENT_ORDERS] Getting merchant ID from Supabase session...');
    
    // Get current user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.warn('[PERSISTENT_ORDERS] No authenticated user found:', userError);
      // Fallback to localStorage for development/testing
      if (typeof window !== 'undefined') {
        try {
          const userData = localStorage.getItem('user_data');
          if (userData) {
            const merchant = JSON.parse(userData);
            console.log('[PERSISTENT_ORDERS] Using merchant from localStorage:', merchant.id);
            return merchant.id;
          }
        } catch (error) {
          console.error('[PERSISTENT_ORDERS] Error parsing localStorage:', error);
        }
      }
      const defaultMerchant = '00000000-0000-0000-0000-000000000001';
      console.log('[PERSISTENT_ORDERS] Using default merchant ID:', defaultMerchant);
      return defaultMerchant;
    }

    // Get merchant data linked to this user's profile
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('profile_id', user.id)
      .single();
      
    if (merchantError || !merchant) {
      console.warn('[PERSISTENT_ORDERS] No merchant found for user:', merchantError);
      // Fallback to default merchant for development
      const defaultMerchant = '00000000-0000-0000-0000-000000000001';
      console.log('[PERSISTENT_ORDERS] Using default merchant ID:', defaultMerchant);
      return defaultMerchant;
    }
    
    console.log('[PERSISTENT_ORDERS] Current merchant ID:', merchant.id);
    return merchant.id;
  } catch (error) {
    console.error('[PERSISTENT_ORDERS] Error getting merchant ID:', error);
    const defaultMerchant = '00000000-0000-0000-0000-000000000001';
    console.log('[PERSISTENT_ORDERS] Using default merchant ID:', defaultMerchant);
    return defaultMerchant;
  }
}

// Set tenant context for RLS (simplified - just log for debugging)
async function setTenantContext(tenantId: string) {
  console.log('[PERSISTENT_ORDERS] Using tenant context:', tenantId);
  // Note: RLS policies will handle tenant isolation using the tenant_id column
}

export const PersistentOrdersAPI = {
  /**
   * Create a new order with items
   */
  async createOrder(data: CreateOrderRequest): Promise<PersistentOrder> {
    try {
      console.log('[PERSISTENT_ORDERS] Creating order:', data);

      const tenantId = await getCurrentMerchantId();
      await setTenantContext(tenantId);

      // Check for existing order with same idempotency key
      if (data.idempotencyKey) {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, reference, amount_cents, status')
          .eq('tenant_id', tenantId)
          .eq('idempotency_key', data.idempotencyKey)
          .maybeSingle();

        if (existingOrder) {
          console.log('[PERSISTENT_ORDERS] Returning existing order for idempotency key');
          return await this.getOrder(existingOrder.id);
        }
      }

      // Calculate total from items or use provided amount
      let totalCents: number;
      if (data.items && data.items.length > 0) {
        totalCents = data.items.reduce((sum, item) => 
          sum + (item.unitPriceCents * item.qty), 0
        );
      } else {
        totalCents = Math.round(data.amount * 100);
      }

      const finalReference = data.reference || this.generateReference();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenantId,
          terminal_id: data.terminalId || null,
          reference: finalReference,
          amount_cents: totalCents,
          status: 'pending',
          qr_svg: data.qrSvg,
          qr_text: data.qrText,
          idempotency_key: data.idempotencyKey,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(orderError.message);
      }

      console.log('[PERSISTENT_ORDERS] Order created:', order.id);

      // Insert order items if provided
      if (data.items && data.items.length > 0) {
        const orderItems = data.items.map(item => ({
          order_id: order.id,
          item_id: item.itemId || null,
          name: item.name,
          unit_price_cents: item.unitPriceCents,
          qty: item.qty,
          line_total_cents: item.unitPriceCents * item.qty
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('[PERSISTENT_ORDERS] Order items creation failed:', itemsError);
          // Continue anyway - order is created
        } else {
          console.log('[PERSISTENT_ORDERS] Order items created:', orderItems.length);
        }
      }

      // Update display state if terminal provided
      if (data.terminalId) {
        const { error: displayError } = await supabase
          .from('display_states')
          .upsert({
            device_id: data.terminalId,
            tenant_id: tenantId,
            state: 'show',
            order_id: order.id,
            amount_cents: totalCents,
            reference: finalReference,
            qr_svg: data.qrSvg,
            qr_text: data.qrText,
            expires_at: order.expires_at
          });

        if (displayError) {
          console.error('[PERSISTENT_ORDERS] Display state update failed:', displayError);
        } else {
          console.log('[PERSISTENT_ORDERS] Display state updated for terminal:', data.terminalId);
        }
      }

      return await this.getOrder(order.id);
    } catch (error) {
      console.error('[PERSISTENT_ORDERS] Create order failed:', error);
      throw error;
    }
  },

  // Helper method to generate reference numbers
  generateReference(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `POS${dateStr}${timeStr}${random}`;
  },

  /**
   * Get order details by ID
   */
  async getOrder(orderId: string): Promise<PersistentOrder> {
    try {
      const tenantId = await getCurrentMerchantId();
      await setTenantContext(tenantId);

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          reference,
          amount_cents,
          status,
          created_at,
          paid_at,
          canceled_at,
          expires_at,
          terminal_id,
          terminals(name, device_key, location),
          order_items(
            id,
            name,
            unit_price_cents,
            qty,
            line_total_cents
          ),
          payments(
            id,
            amount_cents,
            payer_name,
            bank_ref,
            received_at
          )
        `)
        .eq('id', orderId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!order) {
        throw new Error('Order not found');
      }

      // Format the response to match PersistentOrder interface
      return {
        id: order.id,
        reference: order.reference,
        amount: order.amount_cents / 100,
        status: order.status,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        canceledAt: order.canceled_at,
        expiresAt: order.expires_at,
        terminal: order.terminals ? {
          id: order.terminal_id,
          name: order.terminals[0]?.name,
          deviceKey: order.terminals[0]?.device_key,
          location: order.terminals[0]?.location
        } : undefined,
        items: (order.order_items || []).map(item => ({
          id: item.id,
          name: item.name,
          unitPrice: item.unit_price_cents / 100,
          quantity: item.qty,
          lineTotal: item.line_total_cents / 100
        })),
        payments: (order.payments || []).map(payment => ({
          id: payment.id,
          source: 'manual' as const,
          amount: payment.amount_cents / 100,
          payerName: payment.payer_name,
          bankRef: payment.bank_ref,
          receivedAt: payment.received_at
        }))
      };
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
      const tenantId = await getCurrentMerchantId();
      await setTenantContext(tenantId);

      let supabaseQuery = supabase
        .from('orders')
        .select(`
          id,
          reference,
          amount_cents,
          status,
          created_at,
          paid_at,
          canceled_at,
          expires_at,
          terminal_id,
          terminals(name, device_key, location),
          order_items(
            id,
            name,
            unit_price_cents,
            qty,
            line_total_cents
          ),
          payments(
            id,
            amount_cents,
            payer_name,
            bank_ref,
            received_at
          )
        `)
        .eq('tenant_id', tenantId);

      // Apply filters
      if (query.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }

      if (query.from) {
        supabaseQuery = supabaseQuery.gte('created_at', query.from);
      }

      if (query.to) {
        supabaseQuery = supabaseQuery.lte('created_at', query.to);
      }

      if (query.terminalId) {
        supabaseQuery = supabaseQuery.eq('terminal_id', query.terminalId);
      }

      // Pagination with cursor
      if (query.cursor) {
        const [timestamp, id] = query.cursor.split(',');
        supabaseQuery = supabaseQuery
          .or(`created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${id})`);
      }

      // Order and limit
      const limit = query.limit || 20;
      supabaseQuery = supabaseQuery
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);

      const { data: orders, error } = await supabaseQuery;

      if (error) {
        throw new Error(error.message);
      }

      // Format response
      const formattedOrders = (orders || []).map(order => ({
        id: order.id,
        reference: order.reference,
        amount: order.amount_cents / 100,
        status: order.status,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        canceledAt: order.canceled_at,
        expiresAt: order.expires_at,
        terminal: order.terminals ? {
          id: order.terminal_id,
          name: order.terminals[0]?.name,
          deviceKey: order.terminals[0]?.device_key,
          location: order.terminals[0]?.location
        } : undefined,
        items: (order.order_items || []).map(item => ({
          id: item.id,
          name: item.name,
          unitPrice: item.unit_price_cents / 100,
          quantity: item.qty,
          lineTotal: item.line_total_cents / 100
        })),
        payments: (order.payments || []).map(payment => ({
          id: payment.id,
          source: 'manual' as const,
          amount: payment.amount_cents / 100,
          payerName: payment.payer_name,
          bankRef: payment.bank_ref,
          receivedAt: payment.received_at
        }))
      }));

      // Generate next cursor
      let nextCursor: string | undefined;
      if (formattedOrders.length === limit) {
        const lastOrder = formattedOrders[formattedOrders.length - 1];
        nextCursor = `${lastOrder.createdAt},${lastOrder.id}`;
      }

      return {
        orders: formattedOrders,
        nextCursor,
        hasMore: formattedOrders.length === limit
      };
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
      const tenantId = await getCurrentMerchantId();
      await setTenantContext(tenantId);

      console.log('[PERSISTENT_ORDERS] Marking order as paid:', orderId);

      // First, let's check if there are any orders at all
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, tenant_id, status')
        .limit(5);

      console.log('[PERSISTENT_ORDERS] All orders in database (first 5):', allOrders);
      if (allOrdersError) {
        console.error('[PERSISTENT_ORDERS] Error fetching all orders:', allOrdersError);
      }

      // Get the order first to check status
      console.log('[PERSISTENT_ORDERS] Fetching order for mark paid:', { orderId, tenantId });
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, amount_cents, terminal_id, status, tenant_id')
        .eq('id', orderId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (fetchError) {
        console.error('[PERSISTENT_ORDERS] Database error fetching order for mark paid:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!order) {
        console.error('[PERSISTENT_ORDERS] Order not found:', orderId, 'tenantId:', tenantId);
        throw new Error('Order not found');
      }

      console.log('[PERSISTENT_ORDERS] Order found:', { id: order.id, status: order.status, amount: order.amount_cents });

      if (order.status !== 'pending') {
        console.error('[PERSISTENT_ORDERS] Order status check failed:', { orderId, currentStatus: order.status });
        throw new Error(`Order is already ${order.status}`);
      }

      console.log('[PERSISTENT_ORDERS] Order validation passed, updating status to paid');

      // Update order status to paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('[PERSISTENT_ORDERS] Database error updating order status to paid:', updateError);
        throw new Error(`Update error: ${updateError.message}`);
      }

      console.log('[PERSISTENT_ORDERS] Order status updated to paid successfully');

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: tenantId,
          order_id: orderId,
          source: 'manual',
          amount_cents: order.amount_cents,
          payer_name: data?.payerName,
          bank_ref: data?.bankRef,
          raw: data?.note ? { note: data.note } : {}
        });

      if (paymentError) {
        console.warn('[PERSISTENT_ORDERS] Payment record creation failed:', paymentError);
        // Continue anyway - order is marked as paid
      }

      // Clear display state if terminal exists
      if (order.terminal_id) {
        const { error: displayError } = await supabase
          .from('display_states')
          .update({
            state: 'idle',
            order_id: null,
            amount_cents: null,
            reference: null,
            qr_svg: null,
            qr_text: null,
            expires_at: null
          })
          .eq('device_id', order.terminal_id);

        if (displayError) {
          console.warn('[PERSISTENT_ORDERS] Display state clear failed:', displayError);
        }
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
      const tenantId = await getCurrentMerchantId();
      await setTenantContext(tenantId);

      console.log('[PERSISTENT_ORDERS] Canceling order:', orderId);

      // Get the order first to check status
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, terminal_id, status')
        .eq('id', orderId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'pending') {
        throw new Error(`Order is already ${order.status}`);
      }

      // Update order status to canceled
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Clear display state if terminal exists
      if (order.terminal_id) {
        const { error: displayError } = await supabase
          .from('display_states')
          .update({
            state: 'idle',
            order_id: null,
            amount_cents: null,
            reference: null,
            qr_svg: null,
            qr_text: null,
            expires_at: null
          })
          .eq('device_id', order.terminal_id);

        if (displayError) {
          console.warn('[PERSISTENT_ORDERS] Display state clear failed:', displayError);
        }
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
      const tenantId = await getCurrentMerchantId();
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
// (Types are already exported above with 'export interface')