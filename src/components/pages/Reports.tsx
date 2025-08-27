import React, { useState } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, Users, Clock, FileText, FileSpreadsheet } from 'lucide-react';
import { useOrderContext } from '../../contexts/OrderContext';
import { exportToCSV, exportToExcel, generateFilename, getOrdersSummary, exportAnalyticsToCSV, exportAnalyticsToExcel } from '../../utils/exportUtils';

export function Reports() {
  const { orders } = useOrderContext();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate metrics
  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0);
  const totalTransactions = orders.filter(o => o.status === 'paid').length;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const successRate = orders.length > 0 ? (totalTransactions / orders.length) * 100 : 0;

  // Filter orders based on date range
  const getFilteredOrders = () => {
    const now = new Date();
    let filteredOrders = orders;

    switch (dateRange) {
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
          end.setHours(23, 59, 59, 999); // Include full end date
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
  const filteredSummary = getOrdersSummary(filteredOrders);

  // Transaction volume by hour (real data)
  const getHourlyData = () => {
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

  const hourlyData = getHourlyData();
  const maxVolume = Math.max(...hourlyData.map(d => d.volume), 100);
  const maxCount = Math.max(...hourlyData.map(d => d.count), 5);

  const handleExportCSV = () => {
    const filename = generateFilename(`paynowgo-analytics-${dateRange}`);
    exportAnalyticsToCSV(filteredOrders, filteredSummary, dateRange, filename);
    
    alert(`Analytics CSV Export Complete!\n\nPeriod: ${dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}\nTotal Orders: ${filteredSummary.totalOrders}\nSuccessful Payments: ${filteredSummary.paidOrders}\nTotal Revenue: S$${filteredSummary.totalRevenue.toFixed(2)}\nSuccess Rate: ${filteredSummary.successRate.toFixed(1)}%`);
  };

  const handleExportExcel = () => {
    const filename = generateFilename(`paynowgo-analytics-${dateRange}`);
    exportAnalyticsToExcel(filteredOrders, filteredSummary, dateRange, filename);
    
    alert(`Analytics Excel Export Complete!\n\nPeriod: ${dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}\nTotal Orders: ${filteredSummary.totalOrders}\nSuccessful Payments: ${filteredSummary.paidOrders}\nTotal Revenue: S$${filteredSummary.totalRevenue.toFixed(2)}\nSuccess Rate: ${filteredSummary.successRate.toFixed(1)}%`);
  };

  const handleExport = () => {
    // Legacy function - show options
    const choice = confirm('Choose export format:\nOK = Excel\nCancel = CSV');
    if (choice) {
      handleExportExcel();
    } else {
      handleExportCSV();
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">Track your PayNow payment performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" title="Refresh Data">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      {dateRange === 'custom' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">S${filteredSummary.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-emerald-600 mt-1">+12% from yesterday</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{filteredSummary.paidOrders}</p>
              <p className="text-xs text-emerald-600 mt-1">+8 from yesterday</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Transaction</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">S${filteredSummary.paidOrders > 0 ? (filteredSummary.totalRevenue / filteredSummary.paidOrders).toFixed(2) : '0.00'}</p>
              <p className="text-xs text-emerald-600 mt-1">+3% from yesterday</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{filteredSummary.successRate.toFixed(1)}%</p>
              <p className="text-xs text-emerald-600 mt-1">Excellent</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Volume Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Transaction Volume</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span>Volume (SGD)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Count</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {hourlyData.map((data, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 w-12 font-mono">
                {data.hour}
              </div>
              
              {/* Volume Bar */}
              <div className="flex-1 relative">
                <div className="bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${maxVolume > 0 ? (data.volume / maxVolume) * 100 : 0}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      S${data.volume.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Count Bar */}
              <div className="w-20">
                <div className="bg-gray-100 rounded-full h-4 relative overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${maxCount > 0 ? (data.count / maxCount) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 text-center mt-1">
                  {data.count} txn
                </div>
              </div>
            </div>
          ))}
          
          {/* Show message if no transaction data */}
          {hourlyData.every(d => d.volume === 0) && (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transaction data for selected period</p>
              <p className="text-sm text-gray-400 mt-1">Charts will populate as orders are processed</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Status Breakdown</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Successful Payments</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{filteredSummary.paidOrders}</div>
                <div className="text-xs text-gray-500">{filteredSummary.successRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Pending Payments</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{filteredSummary.pendingOrders}</div>
                <div className="text-xs text-gray-500">{filteredSummary.totalOrders > 0 ? ((filteredSummary.pendingOrders / filteredSummary.totalOrders) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Failed Payments</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{filteredSummary.failedOrders}</div>
                <div className="text-xs text-gray-500">{filteredSummary.totalOrders > 0 ? ((filteredSummary.failedOrders / filteredSummary.totalOrders) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">System Performance</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Android Listener Uptime</span>
              <span className="text-sm font-medium text-green-600">99.8%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Average Processing Time</span>
              <span className="text-sm font-medium text-gray-900">2.3 seconds</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">QR Code Generation</span>
              <span className="text-sm font-medium text-gray-900">&lt; 100ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Push Notification Success</span>
              <span className="text-sm font-medium text-green-600">97.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}