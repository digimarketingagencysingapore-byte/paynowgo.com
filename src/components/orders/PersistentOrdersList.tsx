import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, CheckCircle, Clock, AlertCircle, FileText, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersistentOrdersAPI, type PersistentOrder, type OrdersQuery } from '@/lib/persistent-orders';
import { OrderDetailsModal } from './OrderDetailsModal';

export function PersistentOrdersList() {
  const [orders, setOrders] = useState<PersistentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'canceled' | 'expired'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<PersistentOrder | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Load initial orders
  useEffect(() => {
    loadOrders(true);
  }, [statusFilter, dateFrom, dateTo]);

  const loadOrders = async (reset: boolean = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setOrders([]);
        setNextCursor(undefined);
      } else {
        setIsLoadingMore(true);
      }
      setError('');

      const query: OrdersQuery = {
        limit: 20,
        cursor: reset ? undefined : nextCursor
      };

      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }

      if (dateFrom) {
        query.from = new Date(dateFrom).toISOString();
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.to = toDate.toISOString();
      }

      console.log('[ORDERS_LIST] Loading orders with query:', query);

      const response = await PersistentOrdersAPI.listOrders(query);
      
      console.log('[ORDERS_LIST] Loaded orders:', response.orders.length);

      if (reset) {
        setOrders(response.orders);
      } else {
        setOrders(prev => [...prev, ...response.orders]);
      }

      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);

    } catch (error) {
      console.error('[ORDERS_LIST] Load orders failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Filter orders by search term (client-side for loaded orders)
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      order.reference.toLowerCase().includes(searchLower) ||
      order.items.some(item => item.name.toLowerCase().includes(searchLower)) ||
      order.payments.some(payment => 
        payment.payerName?.toLowerCase().includes(searchLower) ||
        payment.bankRef?.toLowerCase().includes(searchLower)
      )
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'canceled':
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'canceled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    try {
      await PersistentOrdersAPI.markOrderPaid(orderId);
      
      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'paid' as const, paidAt: new Date().toISOString() }
          : order
      ));

      alert('Order marked as paid successfully!');
    } catch (error) {
      console.error('[ORDERS_LIST] Mark paid failed:', error);
      alert('Failed to mark order as paid: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await PersistentOrdersAPI.cancelOrder(orderId);
      
      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'canceled' as const, canceledAt: new Date().toISOString() }
          : order
      ));

      alert('Order canceled successfully!');
    } catch (error) {
      console.error('[ORDERS_LIST] Cancel order failed:', error);
      alert('Failed to cancel order: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleViewDetails = (order: PersistentOrder) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleExport = async () => {
    try {
      // Get all orders for export (no pagination)
      const allOrders = await PersistentOrdersAPI.listOrders({
        limit: 1000,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined
      });

      // Convert to CSV
      const csvData = allOrders.orders.map(order => ({
        Reference: order.reference,
        Amount: order.amount.toFixed(2),
        Status: order.status,
        Items: order.items.map(item => `${item.quantity}x ${item.name}`).join('; '),
        Terminal: order.terminal?.name || 'N/A',
        Created: new Date(order.createdAt).toLocaleString(),
        Paid: order.paidAt ? new Date(order.paidAt).toLocaleString() : ''
      }));

      // Create CSV content
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Exported ${csvData.length} orders to CSV`);
    } catch (error) {
      console.error('[ORDERS_LIST] Export failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Persistent Orders</h2>
          <p className="text-gray-600 mt-1">Complete order history with items and payments</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => loadOrders(true)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <Input
              placeholder="Search orders, items, or payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="canceled">Canceled</option>
            <option value="expired">Expired</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Terminal
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {order.reference}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {order.id.slice(0, 8)}...
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.items.length > 0 ? (
                        <div>
                          <div className="font-medium">
                            {order.items.slice(0, 2).map(item => 
                              `${item.quantity}x ${item.name}`
                            ).join(', ')}
                          </div>
                          {order.items.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{order.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No items</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      S${order.amount.toFixed(2)}
                    </div>
                    {order.payments.length > 0 && (
                      <div className="text-xs text-emerald-600">
                        {order.payments.length} payment{order.payments.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.terminal?.name || 'No terminal'}
                    </div>
                    {order.terminal?.location && (
                      <div className="text-xs text-gray-500">
                        {order.terminal.location}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleViewDetails(order)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      
                      {order.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleMarkPaid(order.id)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Mark Paid
                          </Button>
                          <Button
                            onClick={() => handleCancelOrder(order.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? 'Try adjusting your search criteria' : 'Orders will appear here once created'}
            </p>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="p-6 border-t border-gray-200 text-center">
            <Button
              onClick={() => loadOrders(false)}
              disabled={isLoadingMore}
              variant="outline"
            >
              {isLoadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Load More Orders
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setSelectedOrder(null);
          setIsDetailsModalOpen(false);
        }}
        onMarkPaid={handleMarkPaid}
        onMarkFailed={handleCancelOrder}
      />
    </div>
  );
}