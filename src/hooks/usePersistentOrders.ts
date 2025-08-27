import { useState, useEffect, useCallback } from 'react';
import { PersistentOrdersAPI, type PersistentOrder, type CreateOrderRequest } from '@/lib/persistent-orders';

export function usePersistentOrders() {
  const [orders, setOrders] = useState<PersistentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load recent orders
  const loadRecentOrders = useCallback(async (limit: number = 10) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await PersistentOrdersAPI.listOrders({ limit });
      setOrders(response.orders);
    } catch (error) {
      console.error('[USE_PERSISTENT_ORDERS] Load failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new order
  const createOrder = useCallback(async (data: CreateOrderRequest): Promise<PersistentOrder> => {
    try {
      setError(null);
      
      const newOrder = await PersistentOrdersAPI.createOrder(data);
      
      // Add to local state
      setOrders(prev => [newOrder, ...prev]);
      
      return newOrder;
    } catch (error) {
      console.error('[USE_PERSISTENT_ORDERS] Create failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Mark order as paid
  const markOrderPaid = useCallback(async (orderId: string, data?: {
    payerName?: string;
    bankRef?: string;
    note?: string;
  }) => {
    try {
      setError(null);
      
      await PersistentOrdersAPI.markOrderPaid(orderId, data);
      
      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'paid' as const, paidAt: new Date().toISOString() }
          : order
      ));
    } catch (error) {
      console.error('[USE_PERSISTENT_ORDERS] Mark paid failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark order as paid';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Cancel order
  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      setError(null);
      
      await PersistentOrdersAPI.cancelOrder(orderId);
      
      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'canceled' as const, canceledAt: new Date().toISOString() }
          : order
      ));
    } catch (error) {
      console.error('[USE_PERSISTENT_ORDERS] Cancel failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Load orders on mount
  useEffect(() => {
    loadRecentOrders();
  }, [loadRecentOrders]);

  return {
    orders,
    isLoading,
    error,
    createOrder,
    markOrderPaid,
    cancelOrder,
    loadRecentOrders
  };
}