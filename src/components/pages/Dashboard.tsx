import React from 'react';
import { DollarSign, QrCode, CheckCircle, Clock, TrendingUp, Users, Calendar, Package, Filter, BarChart3 } from 'lucide-react';
import { useOrderContext } from '../../contexts/OrderContext';
import type { Page } from '../../App';

interface DashboardProps {
  onNavigate?: (page: Page) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { orders } = useOrderContext();
  const [dateFilter, setDateFilter] = React.useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [showProductAnalytics, setShowProductAnalytics] = React.useState(false);

  // Filter orders based on date range
  const getFilteredOrders = () => {
    const now = new Date();
    let filteredOrders = orders;

    switch (dateFilter) {
      case 'today':
        filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredOrders = orders.filter(order => new Date(order.createdAt) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredOrders = orders.filter(order => new Date(order.createdAt) >= monthAgo);
        break;
      case 'custom':
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= start && orderDate <= end;
          });
        }
        break;
    }

    return filteredOrders;
  };

  const filteredOrders = getFilteredOrders();

  const getDateRangeLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'custom': return startDate && endDate ? `${startDate} - ${endDate}` : 'Custom Range';
      default: return 'Today';
    }
  };

  // Generate hourly transaction data from real orders
  const getHourlyTransactionData = () => {
    const hourlyData = Array.from({ length: 12 }, (_, i) => ({
      hour: `${8 + i}:00`,
      volume: 0,
      count: 0
    }));

    filteredOrders.forEach(order => {
      if (order.status === 'paid') {
        const orderHour = new Date(order.createdAt).getHours();
        const dataIndex = orderHour - 8; // Start from 8 AM
        
        if (dataIndex >= 0 && dataIndex < 12) {
          hourlyData[dataIndex].volume += order.amount;
          hourlyData[dataIndex].count += 1;
        }
      }
    });

    return hourlyData;
  };

  const hourlyTransactionData = getHourlyTransactionData();
  const maxVolume = Math.max(...hourlyTransactionData.map(d => d.volume), 100);
  const maxCount = Math.max(...hourlyTransactionData.map(d => d.count), 5);

  // Calculate product analytics
  const getProductAnalytics = () => {
    const productStats = new Map();
    
    filteredOrders.forEach(order => {
      if (order.items && order.status === 'paid') {
        order.items.forEach(item => {
          const key = item.name;
          if (!productStats.has(key)) {
            productStats.set(key, {
              name: item.name,
              totalQuantity: 0,
              totalRevenue: 0,
              orderCount: 0,
              avgPrice: 0
            });
          }
          
          const stats = productStats.get(key);
          stats.totalQuantity += item.quantity;
          stats.totalRevenue += item.totalCents / 100;
          stats.orderCount += 1;
          stats.avgPrice = stats.totalRevenue / stats.totalQuantity;
        });
      }
    });

    return Array.from(productStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10); // Top 10 products
  };

  const productAnalytics = getProductAnalytics();
  
  // Calculate stats from filtered orders (based on date range)
  const totalOrders = filteredOrders.length;
  const paidOrders = filteredOrders.filter(o => o.status === 'paid').length;
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
  const failedOrders = filteredOrders.filter(o => o.status === 'failed').length;
  const totalRevenue = filteredOrders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.amount, 0);
  
  const stats = [
    { label: 'Total Revenue', value: `S$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'emerald' },
    { label: `Orders ${getDateRangeLabel()}`, value: totalOrders.toString(), icon: QrCode, color: 'blue' },
    { label: 'Successful Payments', value: paidOrders.toString(), icon: CheckCircle, color: 'emerald' },
    { label: 'Pending Payments', value: pendingOrders.toString(), icon: Clock, color: 'orange' }
  ];

  const recentOrders = filteredOrders.slice(0, 5);

  return (
    <div className="p-6 space-y-8">
      {/* Header with Date Filter */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Overview for {getDateRangeLabel()}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Product Analytics Toggle */}
          <button
            onClick={() => setShowProductAnalytics(!showProductAnalytics)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm ${
              showProductAnalytics 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Product Analytics</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateFilter === 'custom' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  {index === 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      {dateFilter === 'today' ? 
                        (paidOrders > 0 ? `${paidOrders} transactions` : 'No transactions today') :
                        `${paidOrders} paid orders`
                      }
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-50`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Analytics Section */}
      {showProductAnalytics && productAnalytics.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Top Selling Products</h3>
                <p className="text-sm text-gray-600">Based on revenue for {getDateRangeLabel().toLowerCase()}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {productAnalytics.length} products
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity Sold
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productAnalytics.map((product, index) => (
                  <tr key={product.name} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{product.totalQuantity}</div>
                      <div className="text-xs text-gray-500">units</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-600">S${product.totalRevenue.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">S${product.avgPrice.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.orderCount}</div>
                      <div className="text-xs text-gray-500">orders</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Payment Activity - {getDateRangeLabel()}</h3>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-600 font-medium">
                {filteredOrders.length} orders
              </span>
            </div>
          </div>
          
          {/* Simple activity visualization */}
          <div className="space-y-4">
            {hourlyTransactionData.slice(0, 6).map((data, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="text-xs text-gray-500 w-12">
                  {data.hour}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${maxVolume > 0 ? (data.volume / maxVolume) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 w-16">
                  S${data.volume.toFixed(0)}
                </div>
              </div>
            ))}
            
            {/* Show message if no data */}
            {hourlyTransactionData.every(d => d.volume === 0) && (
              <div className="text-center py-4">
                <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No transaction data for {getDateRangeLabel().toLowerCase()}</p>
                <p className="text-xs text-gray-400">Activity will appear here once orders are processed</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Orders - {getDateRangeLabel()}</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.reference}</p>
                    <p className="text-xs text-gray-500">{order.timestamp}</p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">S${order.amount.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'paid' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No orders for {getDateRangeLabel().toLowerCase()}</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here once created</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 rounded-xl text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-bold">Ready to Accept Payments?</h3>
            <p className="text-emerald-100 text-sm">Generate QR codes and track payments in real-time</p>
          </div>
          <button 
            onClick={() => onNavigate?.('pos')}
            className="bg-white text-emerald-700 px-6 py-3 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
          >
            Open POS System
          </button>
        </div>
      </div>
    </div>
  );
}