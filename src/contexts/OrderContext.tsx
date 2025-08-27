import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MerchantOrdersAPI } from '../lib/merchant-database';
import { terminalSync, DEFAULT_TERMINALS } from '../lib/terminal-sync';

export interface Order {
  id: string;
  reference: string;
  description: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  timestamp: string;
  createdAt: Date;
  items?: OrderItem[];
  merchantId?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

interface OrderContextType {
  orders: Order[];
  createOrder: (order: Omit<Order, 'id' | 'status' | 'timestamp' | 'createdAt'>) => Order;
  updateOrderStatus: (id: string, status: 'pending' | 'paid' | 'failed') => void;
  markOrderPaid: (reference: string) => void;
  deleteOrder: (id: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentMerchantId, setCurrentMerchantId] = useState<string | null>(null);
  
  // Load orders for current merchant from database
  React.useEffect(() => {
    loadOrdersFromSupabase();
  }, []);

  const loadOrdersFromSupabase = async () => {
    try {
      console.log('[ORDER_CONTEXT] Loading orders from Supabase...');
      setCurrentMerchantId('00000000-0000-0000-0000-000000000001');
      
      // Load orders directly from Supabase
      const response = await fetch('/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('[ORDER_CONTEXT] Failed to load orders:', response.status);
        return;
      }
      
      const data = await response.json();
      const merchantOrders = data.orders || [];
      console.log('[ORDER_CONTEXT] Loaded orders from database:', merchantOrders.length);
      
      // Convert to Order format
      const formattedOrders = merchantOrders.map((order: any) => ({
        id: order.id,
        reference: order.reference,
        description: (() => {
          try {
            return 'PayNow Payment';
          } catch {
            return 'PayNow Payment';
          }
        })(),
        amount: order.amount_cents ? order.amount_cents / 100 : order.amount,
        status: order.status,
        timestamp: new Date(order.created_at).toLocaleTimeString(),
        createdAt: new Date(order.created_at),
        items: (() => {
          try {
            return order.items || [];
          } catch {
            return [];
          }
        })(),
        merchantId: order.tenant_id || merchant.id
      }));
      
      setOrders(formattedOrders);
    } catch (error) {
      console.error('[ORDER_CONTEXT] Error loading merchant orders:', error);
      setOrders([]); // Set empty array on error
    }
  };
  
  // Listen for storage changes to sync across devices
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('paynowgo_orders_') && currentMerchantId) {
        console.log('[ORDER_CONTEXT] Orders updated on another device, reloading...');
        loadOrdersFromSupabase();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentMerchantId]);

  const createOrder = async (orderData: Omit<Order, 'id' | 'status' | 'timestamp' | 'createdAt'>): Promise<Order> => {
    console.log('[ORDER_CONTEXT] Creating new order:', orderData);
    
    if (!currentMerchantId) {
      console.error('[ORDER_CONTEXT] No current merchant ID');
      throw new Error('No merchant logged in');
    }
    
    try {
      // Create order via API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: currentMerchantId,
          amount: orderData.amount,
          reference: orderData.reference,
          items: orderData.items?.map(item => ({
            itemId: item.id,
            name: item.name,
            unitPriceCents: item.unitPriceCents,
            qty: item.quantity
          })) || [],
          qrSvg: orderData.qrSvg || '',
          qrText: orderData.qrSvg || '',
          idempotencyKey: crypto.randomUUID(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ORDER_CONTEXT] API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const dbOrder = await response.json();
      
      console.log('[ORDER_CONTEXT] Order created via API:', dbOrder.orderId);
      
      // Convert to Order format
      const newOrder: Order = {
        id: dbOrder.orderId,
        reference: dbOrder.reference,
        description: orderData.description || 'PayNow Payment',
        amount: dbOrder.amount,
        status: dbOrder.status || 'pending',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: new Date(),
        items: orderData.items || [],
        merchantId: currentMerchantId
      };
      
      // Update local state
      setOrders(prev => [newOrder, ...prev]);
      
      return newOrder;
    } catch (error) {
      console.error('[ORDER_CONTEXT] Error creating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: 'pending' | 'paid' | 'failed') => {
    if (!currentMerchantId) return;
    
    try {
      // Update via API
      const endpoint = status === 'paid' ? `/api/orders/${id}/mark-paid` : `/api/orders/${id}/cancel`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      console.log('[ORDER_CONTEXT] Order status updated in database');
      
      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === id
          ? { ...order, status, timestamp: new Date().toLocaleTimeString() }
          : order
      ));
      
      // If marking as paid, hide QR code
      if (status === 'paid') {
        // Clear QR from ALL terminals
        await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_1);
        await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_2);
      }
    } catch (error) {
      console.error('[ORDER_CONTEXT] Error updating order status:', error);
      alert('Failed to update order status: ' + error.message);
    }
  };

  const markOrderPaid = async (reference: string) => {
    if (!currentMerchantId) return;
    
    try {
      // Find order by reference
      const order = orders.find(o => o.reference === reference);
      if (order) {
        await updateOrderStatus(order.id, 'paid');
      }
    } catch (error) {
      console.error('[ORDER_CONTEXT] Error marking order paid:', error);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!currentMerchantId) return;
    
    const orderToDelete = orders.find(o => o.id === id);
    if (!orderToDelete) return;
    
    if (window.confirm(`Are you sure you want to delete order ${orderToDelete.reference}?`)) {
      try {
        // Delete from database would go here (not implemented in current schema)
        // For now, just update local state
        setOrders(prev => prev.filter(order => order.id !== id));
        
        // If it's a pending order, hide QR code
        if (orderToDelete.status === 'pending') {
          // Clear QR from ALL terminals
          await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_1);
          await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_2);
        }
      } catch (error) {
        console.error('[ORDER_CONTEXT] Error deleting order:', error);
      }
    }
  };

  return (
    <OrderContext.Provider value={{ orders, createOrder, updateOrderStatus, markOrderPaid, deleteOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrderContext() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
}