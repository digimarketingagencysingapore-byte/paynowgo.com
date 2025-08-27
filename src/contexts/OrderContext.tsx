import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MerchantOrdersDB, type MerchantOrder } from '../lib/merchant-database';
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
      console.log('[ORDER_CONTEXT] Loading orders using MerchantOrdersDB...');
      
      // Use the new MerchantOrdersDB to get orders for current merchant
      const merchantOrders = await MerchantOrdersDB.getAll();
      console.log('[ORDER_CONTEXT] Loaded orders from database:', merchantOrders.length);
      
      // Convert MerchantOrder to Order format
      const formattedOrders: Order[] = merchantOrders.map((order: MerchantOrder) => {
        let parsedPayload: any = {};
        try {
          parsedPayload = order.payload ? JSON.parse(order.payload) : {};
        } catch (error) {
          console.warn('[ORDER_CONTEXT] Failed to parse payload for order:', order.id, error);
        }

        return {
          id: order.id,
          reference: order.reference,
          description: parsedPayload.description || 'PayNow Payment',
          amount: order.amount,
          status: order.status as 'pending' | 'paid' | 'failed',
          timestamp: new Date(order.created_at).toLocaleTimeString(),
          createdAt: new Date(order.created_at),
          items: parsedPayload.items || [],
          merchantId: order.tenant_id
        };
      });
      
      setOrders(formattedOrders);
      
      // Set current merchant ID from first order (if any)
      if (formattedOrders.length > 0) {
        setCurrentMerchantId(formattedOrders[0].merchantId || null);
      }
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
    
    try {
      // Create order using MerchantOrdersDB
      const dbOrder = await MerchantOrdersDB.create({
        reference: orderData.reference,
        amount: orderData.amount,
        description: orderData.description,
        qrSvg: orderData.qrSvg || undefined,
        items: orderData.items || []
      });
      
      console.log('[ORDER_CONTEXT] Order created via MerchantOrdersDB:', dbOrder.id);
      
      // Convert MerchantOrder to Order format
      let parsedPayload: any = {};
      try {
        parsedPayload = dbOrder.payload ? JSON.parse(dbOrder.payload) : {};
      } catch (error) {
        console.warn('[ORDER_CONTEXT] Failed to parse payload:', error);
      }

      const newOrder: Order = {
        id: dbOrder.id,
        reference: dbOrder.reference,
        description: parsedPayload.description || orderData.description || 'PayNow Payment',
        amount: dbOrder.amount,
        status: dbOrder.status as 'pending' | 'paid' | 'failed',
        timestamp: new Date(dbOrder.created_at).toLocaleTimeString(),
        createdAt: new Date(dbOrder.created_at),
        items: parsedPayload.items || orderData.items || [],
        merchantId: dbOrder.tenant_id
      };
      
      // Update local state and current merchant ID
      setOrders(prev => [newOrder, ...prev]);
      setCurrentMerchantId(dbOrder.tenant_id);
      
      return newOrder;
    } catch (error) {
      console.error('[ORDER_CONTEXT] Error creating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: 'pending' | 'paid' | 'failed') => {
    try {
      // Update status using MerchantOrdersDB
      const dbStatus = status === 'failed' ? 'canceled' : status;
      const updatedOrder = await MerchantOrdersDB.updateStatus(id, dbStatus as 'paid' | 'canceled');
      
      if (updatedOrder) {
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
      }
    } catch (error) {
      console.error('[ORDER_CONTEXT] Error updating order status:', error);
      alert('Failed to update order status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const markOrderPaid = async (reference: string) => {
    try {
      // Mark as paid using MerchantOrdersDB
      const updatedOrder = await MerchantOrdersDB.markPaidByReference(reference);
      
      if (updatedOrder) {
        console.log('[ORDER_CONTEXT] Order marked as paid in database');
        
        // Update local state
        setOrders(prev => prev.map(order =>
          order.reference === reference
            ? { ...order, status: 'paid' as const, timestamp: new Date().toLocaleTimeString() }
            : order
        ));
        
        // Clear QR from ALL terminals
        await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_1);
        await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_2);
      }
    } catch (error) {
      console.error('[ORDER_CONTEXT] Error marking order paid:', error);
    }
  };

  const deleteOrder = async (id: string) => {
    const orderToDelete = orders.find(o => o.id === id);
    if (!orderToDelete) return;
    
    if (window.confirm(`Are you sure you want to delete order ${orderToDelete.reference}?`)) {
      try {
        // Delete from database using MerchantOrdersDB
        const success = await MerchantOrdersDB.delete(id);
        
        if (success) {
          // Update local state
          setOrders(prev => prev.filter(order => order.id !== id));
          
          // If it's a pending order, hide QR code
          if (orderToDelete.status === 'pending') {
            // Clear QR from ALL terminals
            await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_1);
            await terminalSync.clearTerminal(DEFAULT_TERMINALS.COUNTER_2);
          }
          
          console.log('[ORDER_CONTEXT] Order deleted successfully');
        }
      } catch (error) {
        console.error('[ORDER_CONTEXT] Error deleting order:', error);
        alert('Failed to delete order: ' + (error instanceof Error ? error.message : 'Unknown error'));
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