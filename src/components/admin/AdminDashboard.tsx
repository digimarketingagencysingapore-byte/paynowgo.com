'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, Building2, CheckCircle, XCircle, Clock, LogOut, Edit3, BarChart3, DollarSign, ArrowRight, Search } from 'lucide-react';
import { CreateMerchantModal } from './CreateMerchantModal';
import { EditMerchantModal } from './EditMerchantModal';
import { CMSEditor } from './CMSEditor';
import { MerchantsDB, needsAdminMigration, migrateAdminData, AdminUsersDB } from '../../lib/admin-database';
import type { Merchant } from '../../lib/admin-database';
import type { AuthUser } from '../../../types';

interface AdminDashboardProps {
  currentUser: AuthUser;
}

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'merchants' | 'cms'>('merchants');

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    setIsLoading(true);
    setError(''); // Clear any previous errors
    try {
      // Verify current user is still authenticated and is admin
      const user = await AdminUsersDB.getCurrentUser();
      if (!user) {
        console.log('[ADMIN_DASHBOARD] No authenticated user found, redirecting to login');
        window.location.href = '/admin';
        return;
      }

      // Check if migration is needed (legacy function - can be removed eventually)
      if (needsAdminMigration()) {
        console.log('[ADMIN_DASHBOARD] Migration needed, performing migration...');
        await migrateAdminData();
      }
      
      // Load merchants from database using admin client
      const merchantsData = await MerchantsDB.getAll();
      console.log('[ADMIN_DASHBOARD] Merchants loaded from database:', merchantsData.length);
      console.log('[ADMIN_DASHBOARD] Merchants data:', merchantsData.map(m => ({ id: m.id, name: m.businessName, email: m.email })));
      setMerchants(merchantsData);
    } catch (error) {
      console.error('[ADMIN_DASHBOARD] Error fetching merchants:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch merchants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (merchantId: string, newStatus: 'active' | 'suspended' | 'pending') => {
    try {
      console.log('[ADMIN_DASHBOARD] Updating merchant status:', merchantId, 'to', newStatus);
      
      const updatedMerchant = await MerchantsDB.updateStatus(merchantId, newStatus);
      
      if (updatedMerchant) {
        setMerchants(prev => 
          prev.map(merchant => 
            merchant.id === merchantId ? updatedMerchant : merchant
          )
        );
        console.log('[ADMIN_DASHBOARD] Merchant status updated successfully');
      } else {
        throw new Error('Merchant not found');
      }
    } catch (error) {
      console.error('[ADMIN_DASHBOARD] Error updating merchant status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleEditMerchant = (merchant: Merchant) => {
    setEditingMerchant(merchant);
  };

  const handleDeleteMerchant = async (merchantId: string, businessName: string) => {
    if (!confirm(`Sind Sie sicher, dass Sie "${businessName}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      console.log('[ADMIN_DASHBOARD] Deleting merchant:', merchantId);
      
      const success = await MerchantsDB.delete(merchantId);
      
      if (success) {
        setMerchants(prev => prev.filter(merchant => merchant.id !== merchantId));
        console.log('[ADMIN_DASHBOARD] Merchant deleted successfully');
        alert('Merchant erfolgreich gelöscht!');
      } else {
        throw new Error('Merchant not found');
      }
    } catch (error) {
      console.error('[ADMIN_DASHBOARD] Error deleting merchant:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete merchant');
      alert('Fehler beim Löschen des Merchants: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSubscriptionStatus = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'bg-red-100 text-red-800', days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', color: 'bg-yellow-100 text-yellow-800', days: daysUntilExpiry };
    } else {
      return { status: 'active', color: 'bg-green-100 text-green-800', days: daysUntilExpiry };
    }
  };

  const handleLogout = async () => {
    try {
      console.log('[ADMIN_DASHBOARD] Logging out admin user');
      await AdminUsersDB.signOut();
      window.location.href = '/admin';
    } catch (error) {
      console.error('[ADMIN_DASHBOARD] Error during logout:', error);
      // Force redirect even if logout fails
      window.location.href = '/admin';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PayNowGo Admin</h1>
                <p className="text-sm text-gray-600">
                  Welcome, {currentUser.profile?.full_name || currentUser.email} 
                  {currentUser.profile?.role === 'admin' && <span className="ml-1 text-emerald-600 font-medium">(Admin)</span>}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('merchants')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'merchants'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Merchant Management
              </button>
              <button
                onClick={() => setActiveTab('cms')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'cms'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Edit3 className="w-4 h-4 inline mr-2" />
                Website Content (CMS)
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'merchants' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Merchants</p>
                    <p className="text-2xl font-bold text-gray-900">{merchants.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {merchants.filter(m => m.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {merchants.filter(m => getSubscriptionStatus(m.subscriptionExpiresAt).status === 'expiring').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Expired</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {merchants.filter(m => getSubscriptionStatus(m.subscriptionExpiresAt).status === 'expired').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Analytics */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <DollarSign className="w-6 h-6 text-emerald-600 mr-2" />
                Revenue Analytics
              </h3>
              
              {/* Revenue Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-emerald-500">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-emerald-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Monthly Revenue</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        S${(() => {
                          const total = merchants.reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0);
                          return total.toFixed(2);
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Average per Merchant</p>
                      <p className="text-2xl font-bold text-blue-600">
                        S${(() => {
                          const merchantsWithRevenue = merchants.filter(m => m.monthlyRevenue && m.monthlyRevenue > 0);
                          if (merchantsWithRevenue.length === 0) return '0.00';
                          const total = merchantsWithRevenue.reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0);
                          return (total / merchantsWithRevenue.length).toFixed(2);
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                  <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        S${(() => {
                          const total = merchants
                            .filter(m => m.status === 'active')
                            .reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0);
                          return total.toFixed(2);
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Top Merchant</p>
                      <p className="text-lg font-bold text-purple-600">
                        {(() => {
                          const topMerchant = merchants
                            .filter(m => m.monthlyRevenue && m.monthlyRevenue > 0)
                            .sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0))[0];
                          return topMerchant ? `S$${topMerchant.monthlyRevenue?.toFixed(2)}` : 'S$0.00';
                        })()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(() => {
                          const topMerchant = merchants
                            .filter(m => m.monthlyRevenue && m.monthlyRevenue > 0)
                            .sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0))[0];
                          return topMerchant ? topMerchant.businessName : 'No data';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Revenue Breakdown by Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Status</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Active Merchants</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          S${merchants.filter(m => m.status === 'active').reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {merchants.filter(m => m.status === 'active').length} merchants
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Pending Merchants</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          S${merchants.filter(m => m.status === 'pending').reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {merchants.filter(m => m.status === 'pending').length} merchants
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">Suspended Merchants</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          S${merchants.filter(m => m.status === 'suspended').reduce((sum, m) => sum + (m.monthlyRevenue || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {merchants.filter(m => m.status === 'suspended').length} merchants
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Top Revenue Merchants */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Merchants</h4>
                  <div className="space-y-3">
                    {merchants
                      .filter(m => m.monthlyRevenue && m.monthlyRevenue > 0)
                      .sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0))
                      .slice(0, 5)
                      .map((merchant, index) => (
                        <div key={merchant.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{merchant.businessName}</div>
                              <div className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(merchant.status)}`}>
                                {merchant.status}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-emerald-600">
                            S${merchant.monthlyRevenue?.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    
                    {merchants.filter(m => m.monthlyRevenue && m.monthlyRevenue > 0).length === 0 && (
                      <div className="text-center py-4">
                        <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No revenue data available</p>
                        <p className="text-xs text-gray-400">Add monthly revenue to merchants to see analytics</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Merchants Table */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Merchants</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Merchant</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription Link
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {merchants.map((merchant) => (
                      <tr key={merchant.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {merchant.businessName}
                            </div>
                            {merchant.uen && (
                              <div className="text-sm text-gray-500">UEN: {merchant.uen}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{merchant.email}</div>
                            {merchant.mobile && (
                              <div className="text-sm text-gray-500">{merchant.mobile}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(merchant.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {merchant.subscriptionPlan.charAt(0).toUpperCase() + merchant.subscriptionPlan.slice(1)} plan
                            </div>
                            <div className="text-sm text-gray-500">
                              Expires: {formatDate(merchant.subscriptionExpiresAt)}
                            </div>
                            {(() => {
                              const subStatus = getSubscriptionStatus(merchant.subscriptionExpiresAt);
                              return (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${subStatus.color} mt-1`}>
                                  {subStatus.status === 'expired' 
                                    ? `Expired ${subStatus.days} days ago`
                                    : subStatus.status === 'expiring'
                                    ? `${subStatus.days} days left`
                                    : `${subStatus.days} days left`
                                  }
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {merchant.monthlyRevenue ? `S$${merchant.monthlyRevenue.toFixed(2)}` : 'Not set'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {merchant.subscriptionLink ? (
                            <a
                              href={merchant.subscriptionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-medium rounded-full transition-colors"
                            >
                              <span>Open Subscription</span>
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400">No link</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(merchant.status)}`}>
                            {getStatusIcon(merchant.status)}
                            <span className="capitalize">{merchant.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <select
                              value={merchant.status}
                              onChange={(e) => handleStatusChange(merchant.id, e.target.value as 'active' | 'suspended' | 'pending')}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="pending">Pending</option>
                            </select>
                            <button
                              onClick={() => handleEditMerchant(merchant)}
                              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMerchant(merchant.id, merchant.businessName)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'cms' && (
          <CMSEditor />
        )}
      </div>

      {/* Edit Merchant Modal */}
      {editingMerchant && (
        <EditMerchantModal
          merchant={editingMerchant}
          onClose={() => setEditingMerchant(null)}
          onSuccess={async (updatedMerchant) => {
            console.log('[ADMIN_DASHBOARD] Merchant updated:', updatedMerchant);
            setMerchants(prev => prev.map(m => m.id === updatedMerchant.id ? updatedMerchant : m));
            setEditingMerchant(null);
          }}
        />
      )}

      {/* Create Merchant Modal */}
      {showCreateModal && (
        <CreateMerchantModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={async (newMerchant) => {
            console.log('[ADMIN_DASHBOARD] New merchant created:', newMerchant);
            // Add the new merchant to the list immediately
            setMerchants(prev => [newMerchant, ...prev]);
            setShowCreateModal(false);
            // Force a refresh after a short delay to ensure localStorage is updated
            setTimeout(async () => {
              console.log('[ADMIN_DASHBOARD] Refreshing merchant list after creation...');
              await fetchMerchants();
            }, 500);
          }}
        />
      )}
    </div>
  );
}