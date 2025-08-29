import React, { useState } from 'react';
import { Search, Filter, Download, RefreshCw, CheckCircle, Clock, AlertCircle, FileText, FileSpreadsheet, Eye } from 'lucide-react';
import { useOrderContext } from '../../contexts/OrderContext';
import { OrderDetailsModal } from '../orders/OrderDetailsModal';
import { exportToCSV, exportToExcel, generateFilename, getOrdersSummary } from '../../utils/exportUtils';
import { PersistentOrdersAPI } from '../../lib/persistent-orders';

export function Orders() {
  const { orders, updateOrderStatus, markOrderPaid, deleteOrder } = useOrderContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const handleExportCSV = () => {
    const filename = generateFilename('paynowgo-orders');
    exportToCSV(filteredOrders, filename);
    
    // Show success message
    const summary = getOrdersSummary(filteredOrders);
    alert(`CSV Export Complete!\n\nExported ${summary.totalOrders} orders\nTotal Revenue: S$${summary.totalRevenue.toFixed(2)}`);
  };

  const handleExportExcel = () => {
    const filename = generateFilename('paynowgo-orders');
    exportToExcel(filteredOrders, filename);
    
    // Show success message
    const summary = getOrdersSummary(filteredOrders);
    alert(`Excel Export Complete!\n\nExported ${summary.totalOrders} orders\nTotal Revenue: S$${summary.totalRevenue.toFixed(2)}`);
  };

  const handleRefresh = () => {
    // Simulate refreshing payment status
    alert('Payment status refreshed from listener');
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
    setIsDetailsModalOpen(false);
  };

  const handleMarkPaidFromModal = async (orderId: string) => {
    try {
      await PersistentOrdersAPI.markOrderPaid(orderId);
      updateOrderStatus(orderId, 'paid');
      handleCloseDetails();
    } catch (error) {
      console.error('Failed to mark order as paid:', error);
      alert('Failed to mark order as paid: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleMarkFailedFromModal = async (orderId: string) => {
    try {
      await PersistentOrdersAPI.cancelOrder(orderId);
      updateOrderStatus(orderId, 'failed');
      handleCloseDetails();
    } catch (error) {
      console.error('Failed to mark order as failed:', error);
      alert('Failed to mark order as failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders & Payments</h2>
          <p className="text-gray-600 mt-1">Track all PayNow transactions in real-time</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Status</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reference or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {order.reference}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{order.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      S${order.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.createdAt.toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === 'pending' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="text-emerald-600 hover:text-emerald-900 text-xs px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await PersistentOrdersAPI.markOrderPaid(order.id);
                              updateOrderStatus(order.id, 'paid');
                            } catch (error) {
                              console.error('Failed to mark order as paid:', error);
                              alert('Failed to mark order as paid: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            }
                          }}
                          className="text-emerald-600 hover:text-emerald-900 text-xs px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await PersistentOrdersAPI.cancelOrder(order.id);
                              updateOrderStatus(order.id, 'failed');
                            } catch (error) {
                              console.error('Failed to mark order as failed:', error);
                              alert('Failed to mark order as failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            }
                          }}
                          className="text-red-600 hover:text-red-900 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded"
                        >
                          Mark Failed
                        </button>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                    {(order.status === 'paid' || order.status === 'failed') && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="text-emerald-600 hover:text-emerald-900 text-xs px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No orders found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
        onMarkPaid={handleMarkPaidFromModal}
        onMarkFailed={handleMarkFailedFromModal}
      />
    </div>
  );
}